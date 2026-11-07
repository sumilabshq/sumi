import { PerCall, Repeatable, refuse } from "@widgetarium/data-framework";
import type { Send, User } from "@widgetarium/data-framework";
import { AppTabQuery } from "@widgetarium/places";
import { command, query, subscriber } from "#module";
import {
	AppPageAskSchema,
	AppPageSchema,
	PageTitlesAskSchema,
	PageTitlesSchema,
	PressAppActionSchema,
	RecordedAppPageSchema,
	RememberedPageTitlesSchema,
	TakeActionPressSchema,
	TakenPressSchema,
} from "../../shared/schema/page.schema.js";
import type { PageTab, RememberedPageTitle } from "../../shared/schema/page.schema.js";
import { pageRecordedOf, pageRememberedOf, pageTitleOf, refuseForeignFavicon } from "./lib/page-records.js";
import type { TitledTab } from "./lib/page-records.js";
import type { PageTitlesGateway } from "../../gateways/page-titles/page-titles.gateway.js";
import { onlyShellReasonOf } from "./lib/shell-only.js";
import { KeptPagesChangedEvent } from "../../gateways/pages/pages.events.js";
import type { PagesGateway } from "../../gateways/pages/pages.gateway.js";
import { pressTakenFrom, refusePress, withPressQueued } from "./lib/presses.js";

interface PageReaders {
	readonly pages: PagesGateway;
	readonly pageTitles: PageTitlesGateway;
}

const NOT_ITS_TAB = "tab {id} does not hold the app {app}";

export const AppPageQuery = query("app-page")
	.public()
	.input(AppPageAskSchema)
	.output(AppPageSchema)
	.handle(async ({ id }, { pages, pageTitles, send, user }) => {
		const tab = await ownTabOf(send, user, id);
		const page = pages.page(id);
		return {
			...page,
			title: page.title ?? pageTitles.titleOf(tab.app, tab.address),
		};
	});

export const PageTitlesQuery = query("page-titles")
	.public()
	.input(PageTitlesAskSchema)
	.output(PageTitlesSchema)
	.handle(({ tabs }, { appList, pages, pageTitles, user }) => {
		if (user !== null) {
			return refuse(onlyShellReasonOf(user.id, "read the titles of every tab"));
		}

		const faces = appList.apps();
		return {
			pages: tabs.map((tab) => pageTitleOf(titledTabOf(tab, { pages, pageTitles }), faces)),
		};
	});

function titledTabOf(tab: PageTab, readers: PageReaders): TitledTab {
	const page = readers.pages.page(tab.id);
	return {
		id: tab.id,
		app: tab.app,
		title: page.title ?? readers.pageTitles.titleOf(tab.app, tab.address),
		favicon: page.favicon,
	};
}

export const RecordAppPageCommand = command("record-app-page")
	.public()
	.input(RecordedAppPageSchema)
	.idempotencyKey(Repeatable)
	.handle(async (recorded, { pages, send, user, invalidate }) => {
		const tab = await ownTabOf(send, user, recorded.id);
		const refusal = refuseForeignFavicon(tab.app, recorded.favicon);

		if (refusal !== null) {
			return refuse(refusal);
		}

		const { page, reason } = pageRecordedOf(pages.page(recorded.id), recorded);
		pages.savePage(recorded.id, page, reason);
		console.info(`[apps] ${reason}`);
		invalidate(AppPageQuery, { id: recorded.id });
		invalidate(PageTitlesQuery);
	});

export const PressAppActionCommand = command("press-app-action")
	.public()
	.input(PressAppActionSchema)
	.idempotencyKey(PerCall)
	.handle(({ tab, action }, { pages, user, invalidate }) => {
		if (user !== null) {
			return refuse(onlyShellReasonOf(user.id, "press header actions"));
		}

		const was = pages.page(tab);
		const refusal = refusePress(was, tab, action);

		if (refusal !== null) {
			return refuse(refusal);
		}

		const minted = pages.mintedPresses() + 1;
		const press = { id: `press-${minted}`, action };
		const reason = `tab ${tab} presses +${press.id} ${action}`;
		pages.savePressesMinted(minted);
		pages.savePage(tab, withPressQueued(was, press), reason);
		console.info(`[apps] ${reason}`);
		invalidate(AppPageQuery, { id: tab });
	});

export const TakeActionPressCommand = command("take-action-press")
	.public()
	.input(TakeActionPressSchema)
	.output(TakenPressSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id, press }, { pages, send, user, invalidate }) => {
		await ownTabOf(send, user, id);
		const taken = pressTakenFrom(pages.page(id), id, press);

		if (typeof taken === "string") {
			return refuse(taken);
		}

		const reason = `tab ${id} presses -${press} ${taken.press.action} (taken by the app)`;
		pages.savePage(id, taken.page, reason);
		console.info(`[apps] ${reason}`);
		invalidate(AppPageQuery, { id });
		return taken.press;
	});

async function ownTabOf(send: Send, user: User | null, id: string): Promise<{ app: string; address: string | null }> {
	const tab = await send(AppTabQuery, { id });

	if (user !== null && tab.app !== user.id) {
		return refuse(NOT_ITS_TAB.replace("{id}", id).replace("{app}", user.id));
	}

	return tab;
}

export const RememberPageTitlesCommand = command("remember-page-titles")
	.public()
	.input(RememberedPageTitlesSchema)
	.idempotencyKey(Repeatable)
	.handle(({ pages: remembered }, { pages, user, invalidate }) => {
		if (user !== null) {
			return refuse(onlyShellReasonOf(user.id, "remember the titles of the browser's pages"));
		}

		const kept = remembered.flatMap((one) => keepRemembered(pages, one));

		if (kept.length === 0) {
			return;
		}

		invalidate(PageTitlesQuery);
		for (const id of kept) {
			invalidate(AppPageQuery, { id });
		}
	});

function keepRemembered(pages: PagesGateway, remembered: RememberedPageTitle): readonly string[] {
	const next = pageRememberedOf(pages.page(remembered.tabId), remembered);

	if (next === null) {
		return [];
	}

	pages.savePage(remembered.tabId, next.page, next.reason);
	console.info(`[apps] ${next.reason}`);
	return [remembered.tabId];
}

export const RereadKeptPagesSubscriber = subscriber(KeptPagesChangedEvent).handle((_input, { invalidate }) => {
	invalidate(AppPageQuery);
	invalidate(PageTitlesQuery);
});
