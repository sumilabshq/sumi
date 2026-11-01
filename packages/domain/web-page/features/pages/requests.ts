import { Repeatable, command, deny, guard, middleware, query, refuse, subscriber } from "@widgetarium/core/requests";
import type { Invalidate } from "@widgetarium/core/requests";
import { AppTabsGateway } from "../../gateways/app-tabs/app-tabs.gateway.js";
import { WebPagesChangedEvent } from "../../gateways/web-pages/web-pages.events.js";
import { WebPagesGateway } from "../../gateways/web-pages/web-pages.gateway.js";
import {
	OpenWebPageInputSchema,
	PlaceWebPageInputSchema,
	WebPageSchema,
	WebPageTabSchema,
} from "../../shared/schema/web-page.schema.js";
import type { PageArea, WebPage } from "../../shared/schema/web-page.schema.js";
import { refuseWebUrl } from "./lib/web-url.js";

const CALLED = "[web-page] app {app} → {request} tab {tab}";
const NOT_ITS_TAB = "tab {tab} does not hold the app {app}";
const NO_PAGE = "tab {tab} holds no web page: open one first";
const NOT_OPENED = "the web page was not opened: {reason}";

export const WebPageAccessGuard = guard<{ readonly tab: string }>()
	.needsUser()
	.inject({ appTabs: AppTabsGateway })
	.handle(async ({ input, context }, { appTabs }) => {
		const app = context.user?.id ?? "none";

		if ((await appTabs.appOfTab(input.tab)) !== app) {
			deny(NOT_ITS_TAB.replace("{tab}", input.tab).replace("{app}", app));
		}
	});

export const WebPageCallLoggerMiddleware = middleware().handle(({ request, input, context }, _injected, next) => {
	console.info(
		CALLED.replace("{app}", context.user?.id ?? "none")
			.replace("{request}", request)
			.replace("{tab}", JSON.stringify(tabOf(input))),
	);
	return next();
});

export const WebPageQuery = query("web-page")
	.input(WebPageTabSchema)
	.output(WebPageSchema.nullable())
	.guard(WebPageAccessGuard)
	.inject({ webPages: WebPagesGateway })
	.handle(({ tab }, { webPages }) => webPages.page(tab));

export const RereadWebPageSubscriber = subscriber(WebPagesChangedEvent).handle((_input, { invalidate }) => {
	invalidate(WebPageQuery);
});

export const OpenWebPageCommand = command("open-web-page")
	.input(OpenWebPageInputSchema)
	.idempotencyKey(Repeatable)
	.guard(WebPageAccessGuard)
	.inject({ webPages: WebPagesGateway })
	.handle(async ({ tab, url }, { webPages, invalidate }) => {
		const refusal = refuseWebUrl(url);

		if (refusal !== null) {
			return refuse(NOT_OPENED.replace("{reason}", refusal));
		}

		const was = await webPages.page(tab);
		await webPages.openPage(tab, url);
		logged(invalidate, tab, `${urlSaid(was)} → ${url} (open)`);
	});

export const PlaceWebPageCommand = command("place-web-page")
	.input(PlaceWebPageInputSchema)
	.idempotencyKey(Repeatable)
	.guard(WebPageAccessGuard)
	.inject({ webPages: WebPagesGateway })
	.handle(async ({ tab, area }, { webPages, invalidate }) => {
		await openedPage(webPages, tab);
		const was = webPages.pageArea(tab);
		await webPages.placePage(tab, area);
		logged(invalidate, tab, `placed ${areaSaid(was)} → ${areaSaid(area)}`);
	});

export const GoBackCommand = command("go-back")
	.input(WebPageTabSchema)
	.idempotencyKey(Repeatable)
	.guard(WebPageAccessGuard)
	.inject({ webPages: WebPagesGateway })
	.handle(async ({ tab }, { webPages, invalidate }) => {
		const was = await openedPage(webPages, tab);

		if (!was.canGoBack) {
			return refuse(`tab ${tab} has no page to go back to from ${was.url}`);
		}

		await webPages.pageBack(tab);
		logged(invalidate, tab, `${was.url} → ${urlSaid(await webPages.page(tab))} (back)`);
	});

export const GoForwardCommand = command("go-forward")
	.input(WebPageTabSchema)
	.idempotencyKey(Repeatable)
	.guard(WebPageAccessGuard)
	.inject({ webPages: WebPagesGateway })
	.handle(async ({ tab }, { webPages, invalidate }) => {
		const was = await openedPage(webPages, tab);

		if (!was.canGoForward) {
			return refuse(`tab ${tab} has no page to go forward to from ${was.url}`);
		}

		await webPages.pageForward(tab);
		logged(invalidate, tab, `${was.url} → ${urlSaid(await webPages.page(tab))} (forward)`);
	});

export const ReloadWebPageCommand = command("reload-web-page")
	.input(WebPageTabSchema)
	.idempotencyKey(Repeatable)
	.guard(WebPageAccessGuard)
	.inject({ webPages: WebPagesGateway })
	.handle(async ({ tab }, { webPages, invalidate }) => {
		const was = await openedPage(webPages, tab);
		await webPages.reloadPage(tab);
		logged(invalidate, tab, `${was.url} → ${was.url} (reload)`);
	});

export const CloseWebPageCommand = command("close-web-page")
	.input(WebPageTabSchema)
	.idempotencyKey(Repeatable)
	.guard(WebPageAccessGuard)
	.inject({ webPages: WebPagesGateway })
	.handle(async ({ tab }, { webPages, invalidate }) => {
		const was = await webPages.page(tab);

		if (was === null) {
			console.info(`[widgetarium] web page ${tab} close skipped: no page open`);
			return;
		}

		await webPages.closePage(tab);
		logged(invalidate, tab, `${was.url} → none (close)`);
	});

async function openedPage(webPages: WebPagesGateway, tab: string): Promise<WebPage> {
	const page = await webPages.page(tab);
	return page ?? refuse(NO_PAGE.replace("{tab}", tab));
}

function logged(invalidate: Invalidate, tab: string, change: string): void {
	invalidate(WebPageQuery, { tab });
	console.info(`[widgetarium] web page ${tab} ${change}`);
}

function urlSaid(page: WebPage | null): string {
	return page?.url ?? "none";
}

function areaSaid(area: PageArea | null): string {
	return area === null ? "hidden" : `${area.x},${area.y} ${area.width}×${area.height}`;
}

function tabOf(input: unknown): unknown {
	return typeof input === "object" && input !== null && "tab" in input ? input.tab : null;
}
