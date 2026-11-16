import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import type { AnyQuery, Send } from "@widgetarium/data-framework";
import { browser } from "@widgetarium/browser/contract";
import { layout } from "@widgetarium/layout/contract";
import { navigation } from "@widgetarium/navigation/contract";
import type { TabsAsk, TabsSettled } from "@widgetarium/navigation/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import { StudioWindowGateway } from "../../gateways/studio-window/studio-window.gateway.js";
import { studioCoreChanged } from "../../gateways/core-changes/core-changes.events.js";
import { tabsSettled } from "../../shared/events/tabs.events.js";
import { pageTitlesOf, rememberPageTitles } from "../../shared/lib/page-titles/page-titles-read.js";
import {
	pageTabsOfRows,
	pageTabsOfSidebar,
	titledSidebarOf,
	titledTabOf,
} from "../../shared/lib/page-titles/page-titles.js";
import {
	sendLogged,
	settleAsked,
	tabsAskOf,
} from "../../shared/lib/tab-showing/tab-settling.js";
import { showTabSettled } from "../../shared/lib/tab-showing/tab-opening.js";
import { AppTabsSchema, HeldTabsSchema, TabHoldersAskSchema, TabHoldersSchema, TabsSidebarSchema } from "../../shared/schema/app-tab.schema.js";
import { labelOfPlacesWindow } from "@widgetarium/behaviors";
import { TabDropSchema } from "../../shared/schema/tab-drop.schema.js";
import { TabToShowSchema } from "../../shared/schema/tab-to-show.schema.js";
import type { TabDrop } from "../../shared/schema/tab-drop.schema.js";

const ALL_PAGES = { heldTabId: null };

interface PlacedDrop {
	readonly id: string;
	readonly to: TabDrop;
}

export const appTabs = query()
	.public()
	.output(AppTabsSchema)
	.handle(async (_input, { send, ...injects }) => {
		const rows = await send(navigation.tabs.rows, { at: await tabsAskOf({ injects, send }) });
		const titles = await pageTitlesOf(send, pageTabsOfRows(rows.tabs));
		return { ...rows, tabs: rows.tabs.map((tab) => titledTabOf(tab, titles)) };
	});

export const tabsSidebar = query()
	.public()
	.output(TabsSidebarSchema)
	.handle(async (_input, { send, ...injects }) => {
		const sidebar = await send(navigation.tabs.sidebar, { at: await tabsAskOf({ injects, send }) });
		return titledSidebarOf(sidebar, await pageTitlesOf(send, pageTabsOfSidebar(sidebar)));
	});

export const holders = query()
	.public()
	.input(TabHoldersAskSchema)
	.output(TabHoldersSchema)
	.handle(async ({ ids }, { send, studioWindow }) => {
		const here = studioWindow.placesWindow();
		const held = await send(navigation.tabs.holders, { ids });
		return {
			holders: held.holders.map(({ id, window }) => {
				const isOfThisWorkspace = window !== null && isOfWorkspace(window, here);
				return {
					id,
					isHere: window === here,
					window: isOfThisWorkspace ? labelOfPlacesWindow(window) : null,
				};
			}),
		};
	});

// TODO: a transport that cannot abort (Tauri IPC) leaves held-tabs stale after a dropped call
export const heldTabs = query()
	.public()
	.output(HeldTabsSchema)
	.handle(async (_input, { send, ...injects }) =>
		send(navigation.tabs.heldTabs, { at: await tabsAskOf({ injects, send }) }),
	);

export const canOpenOwnWindow = query()
	.public()
	.output(z.boolean())
	.handle(async (_input, { send }) => (await send(browser.tabs.all, ALL_PAGES)).canOpenOwnWindow);

export const restore = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send, emit, ...injects }) => {
		await readyToRestore(send, injects);
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(navigation.tabShowing.restore, {
				at,
				isBeside: injects.studioWindow.opensBesideAnother(),
				keepsPages: injects.studioWindow.keepsPagesAcrossStarts(),
			}),
		);
	});

export const showTab = command()
	.public()
	.input(TabToShowSchema)
	.idempotencyKey(Repeatable)
	.handle((asked, { send, emit, ...injects }) =>
		showTabSettled({ injects, send, told: () => emit(tabsSettled) }, asked),
	);

export const placeTab = command()
	.public()
	.input(z.object({ id: z.string(), to: TabDropSchema }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id, to }, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, placingOf(send, { id, to }));
	});

export const ensurePanePages = subscriber(layout.paneTree.panesChanged).handle(
	async (_input, { send, emit, invalidate, ...injects }) => {
		invalidateTabReads(invalidate);
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(navigation.tabShowing.fitToPanes, { at }),
		);
	},
);

export const rememberPages = subscriber(browser.browserPages.pagesChanged).handle(
	async (_input, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, async (at) => {
			const settled = await send(navigation.tabShowing.rememberPages, { at });
			await rememberPageTitles(send, at);
			return settled;
		});
	},
);

export const rereadTabs = subscriber(tabsSettled).handle((_input, { invalidate }) => {
	invalidateTabReads(invalidate);
});

export const rereadTabsForCore = subscriber(studioCoreChanged).handle((_input, { invalidate }) => {
	invalidateTabReads(invalidate);
});

export const rereadForPages = subscriber(browser.browserPages.pagesChanged).handle((_input, { invalidate }) => {
	invalidateTabReads(invalidate);
	invalidate(canOpenOwnWindow);
});

export const rereadForAccessAsks = subscriber(browser.accessAsks.accessAsksChanged).handle((_input, { invalidate }) => {
	invalidate(appTabs);
	invalidate(tabsSidebar);
});

export const rereadForInk = subscriber(browser.inkActivity.inkActivityChanged).handle((_input, { invalidate }) => {
	invalidate(appTabs);
	invalidate(tabsSidebar);
});

export const rereadForChats = subscriber(workspaces.chats.chatsChanged).handle((_input, { invalidate }) => {
	invalidate(appTabs);
	invalidate(tabsSidebar);
});

function invalidateTabReads(invalidate: (query: { readonly request: AnyQuery }) => void): void {
	invalidate(appTabs);
	invalidate(tabsSidebar);
	invalidate(heldTabs);
	invalidate(holders);
}

async function dropGoneTabPanes(send: Send, window: string): Promise<void> {
	const placed = await send(navigation.tabs.placedTabs, { window });
	const heldTabIds = placed.tabs.map(({ id }) => id);
	await sendLogged("drop the panes of gone tabs", () => send(layout.paneTabs.dropGoneTabs, { heldTabIds }));
}

async function readyToRestore(send: Send, injects: { readonly studioWindow: StudioWindowGateway }): Promise<void> {
	if (!injects.studioWindow.opensBesideAnother()) {
		await dropGoneTabPanes(send, injects.studioWindow.placesWindow());
	}
}

function placingOf(send: Send, { id, to }: PlacedDrop): (at: TabsAsk) => Promise<TabsSettled> {
	if (to.kind === "list") {
		const place = { list: to.list, groupId: to.groupId, before: to.before };
		return (at) => send(navigation.tabPlacing.place, { at, id, place });
	}

	if (to.kind === "split") {
		return (at) => send(navigation.splits.reorderMember, { at, tabId: id, before: to.before });
	}

	return (at) => send(navigation.tabShowing.openInOwnWindow, { at, id });
}

function isOfWorkspace(window: string, here: string): boolean {
	return window.slice(labelOfPlacesWindow(window).length) === here.slice(labelOfPlacesWindow(here).length);
}
