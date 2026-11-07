import { CallLoggerMiddleware, Repeatable, deny, guard, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import type { Invalidate } from "@widgetarium/data-framework";
import { AppTabsGateway } from "../../gateways/app-tabs/app-tabs.gateway.js";
import { WebPagesChangedEvent } from "../../gateways/web-pages/web-pages.events.js";
import { WebPagesGateway } from "../../gateways/web-pages/web-pages.gateway.js";
import { OpenWebPageInputSchema, PlaceWebPageInputSchema, WebPageSchema, WebPageTabSchema } from "../../shared/schema/web-page.schema.js";
import type { PageArea, WebPage } from "../../shared/schema/web-page.schema.js";
import { refuseWebUrl, urlWithoutFragment } from "./lib/web-url.js";

interface PageStep {
	readonly refusalOf: (was: WebPage, tab: string) => string | null;
	readonly take: (webPages: WebPagesGateway, tab: string) => Promise<void>;
	readonly changeOf: (was: WebPage, now: WebPage | null) => string;
}

interface PageReach {
	readonly webPages: WebPagesGateway;
	readonly invalidate: Invalidate;
}

const TAB_CALLED = "tab {tab}";
const NOT_ITS_TAB = "tab {tab} does not hold the app {app}";
const NO_PAGE = "tab {tab} holds no web page: open one first";
const NOT_OPENED = "the web page was not opened: {reason}";
const NO_APP = "a web page opens only for an app caller";

const GO_BACK: PageStep = {
	refusalOf: (was, tab) => (was.canGoBack ? null : `tab ${tab} has no page to go back to from ${was.url}`),
	take: (webPages, tab) => webPages.goBackPage(tab),
	changeOf: (was, now) => `${was.url} → ${urlOf(now)} (back)`,
};

const GO_FORWARD: PageStep = {
	refusalOf: (was, tab) => (was.canGoForward ? null : `tab ${tab} has no page to go forward to from ${was.url}`),
	take: (webPages, tab) => webPages.goForwardPage(tab),
	changeOf: (was, now) => `${was.url} → ${urlOf(now)} (forward)`,
};

const RELOAD: PageStep = {
	refusalOf: () => null,
	take: (webPages, tab) => webPages.reloadPage(tab),
	changeOf: (was) => `${was.url} reloaded`,
};

const CLOSE: PageStep = {
	refusalOf: () => null,
	take: (webPages, tab) => webPages.closePage(tab),
	changeOf: (was) => `${was.url} → none (close)`,
};

export const AppOwnsTabGuard = guard<{ readonly tab: string }>()
	.needsUser()
	.requires({ appTabs: AppTabsGateway })
	.handle(async ({ input, context: { user } }, { appTabs }) => {
		if (user !== null && (await appTabs.appOfTab(input.tab)) !== user.id) {
			deny(NOT_ITS_TAB.replace("{tab}", input.tab).replace("{app}", user.id));
		}
	});

export const WebPageCallLoggerMiddleware = CallLoggerMiddleware("web-page", (input) =>
	TAB_CALLED.replace("{tab}", WebPageTabSchema.safeParse(input).data?.tab ?? "none"),
);

export const WebPageQuery = query("web-page")
	.public()
	.input(WebPageTabSchema)
	.output(WebPageSchema.nullable())
	.guard(AppOwnsTabGuard)
	.handle(async ({ tab }, { webPages }) => {
		const page = await webPages.page(tab);
		return page === null
			? null
			: {
					...page,
					url: urlWithoutFragment(page.url),
				};
	});

export const RereadWebPageSubscriber = subscriber(WebPagesChangedEvent).handle((_input, { invalidate }) => {
	invalidate(WebPageQuery);
});

export const OpenWebPageCommand = command("open-web-page")
	.public()
	.input(OpenWebPageInputSchema)
	.idempotencyKey(Repeatable)
	.guard(AppOwnsTabGuard)
	.handle(async ({ tab, url }, { webPages, invalidate, user }) => {
		const refusal = refuseWebUrl(url);

		if (refusal !== null) {
			return refuse(NOT_OPENED.replace("{reason}", refusal));
		}

		if (user === null) {
			return refuse(NO_APP);
		}

		const was = await webPages.page(tab);
		await webPages.openPage(tab, url, `app-${user.id}`);
		logPageChange(invalidate, tab, `${urlOf(was)} → ${url} (open)`);
	});

export const PlaceWebPageCommand = command("place-web-page")
	.public()
	.input(PlaceWebPageInputSchema)
	.idempotencyKey(Repeatable)
	.guard(AppOwnsTabGuard)
	.handle(async ({ tab, area }, { webPages, invalidate }) => {
		await pageOrRefuse(webPages, tab);
		const was = webPages.pageArea(tab);
		await webPages.placePage(tab, area);
		logPageChange(invalidate, tab, `placed ${areaOf(was)} → ${areaOf(area)}`);
	});

export const GoBackWebPageCommand = command("go-back-web-page")
	.public()
	.input(WebPageTabSchema)
	.idempotencyKey(Repeatable)
	.guard(AppOwnsTabGuard)
	.handle(({ tab }, reach) => takePageStep(reach, tab, GO_BACK));

export const GoForwardWebPageCommand = command("go-forward-web-page")
	.public()
	.input(WebPageTabSchema)
	.idempotencyKey(Repeatable)
	.guard(AppOwnsTabGuard)
	.handle(({ tab }, reach) => takePageStep(reach, tab, GO_FORWARD));

export const ReloadWebPageCommand = command("reload-web-page")
	.public()
	.input(WebPageTabSchema)
	.idempotencyKey(Repeatable)
	.guard(AppOwnsTabGuard)
	.handle(({ tab }, reach) => takePageStep(reach, tab, RELOAD));

export const CloseWebPageCommand = command("close-web-page")
	.public()
	.input(WebPageTabSchema)
	.idempotencyKey(Repeatable)
	.guard(AppOwnsTabGuard)
	.handle(({ tab }, reach) => takePageStep(reach, tab, CLOSE));

async function takePageStep({ webPages, invalidate }: PageReach, tab: string, step: PageStep): Promise<void> {
	const was = await pageOrRefuse(webPages, tab);
	const refusal = step.refusalOf(was, tab);

	if (refusal !== null) {
		return refuse(refusal);
	}

	await step.take(webPages, tab);
	logPageChange(invalidate, tab, step.changeOf(was, await webPages.page(tab)));
}

async function pageOrRefuse(webPages: WebPagesGateway, tab: string): Promise<WebPage> {
	const page = await webPages.page(tab);
	return page ?? refuse(NO_PAGE.replace("{tab}", tab));
}

function logPageChange(invalidate: Invalidate, tab: string, change: string): void {
	invalidate(WebPageQuery, { tab });
	console.info(`[widgetarium] web page ${tab} ${change}`);
}

function urlOf(page: WebPage | null): string {
	return page?.url ?? "none";
}

function areaOf(area: PageArea | null): string {
	return area === null ? "hidden" : `${area.x},${area.y} ${area.width}×${area.height}`;
}
