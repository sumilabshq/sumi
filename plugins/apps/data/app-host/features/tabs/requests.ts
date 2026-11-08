import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import type { AnyQuery, Send } from "@widgetarium/data-framework";
import { browser } from "@widgetarium/browser";
import { layout } from "@widgetarium/layout";
import { places } from "@widgetarium/places";
import type { TabsAsk, TabsSettled } from "@widgetarium/places";
import { workspaces } from "@widgetarium/workspaces";
import { essentialsChanged } from "../../gateways/essentials/essentials.events.js";
import { EssentialsGateway } from "../../gateways/essentials/essentials.gateway.js";
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
import { addEssential, essentialsOf, nextEssentialIdOf } from "../../shared/lib/essentials/essentials.js";
import {
	sendKeepChatTabs,
	saveEssentials,
	sendLogged,
	settleAsked,
	tabsAskOf,
} from "../../shared/lib/tab-showing/tab-settling.js";
import type { TabsReach } from "../../shared/lib/tab-showing/tab-settling.js";
import { showTabSettled } from "../../shared/lib/tab-showing/tab-opening.js";
import { AppTabsSchema, HeldTabsSchema, TabsSidebarSchema } from "../../shared/schema/app-tab.schema.js";
import { TabDropSchema } from "../../shared/schema/tab-drop.schema.js";
import { TabToShowSchema } from "../../shared/schema/tab-to-show.schema.js";
import type { TabDrop } from "../../shared/schema/tab-drop.schema.js";

const ALL_PAGES = { heldTabId: null };

interface TabParts {
	readonly studioWindow: StudioWindowGateway;
	readonly essentials: EssentialsGateway;
}

interface PlacedDrop {
	readonly id: string;
	readonly to: Exclude<TabDrop, { readonly kind: "essentials" }>;
}

interface EssentialDrop {
	readonly id: string;
	readonly at: number;
}

export const appTabs = query()
	.public()
	.output(AppTabsSchema)
	.handle(async (_input, { send, ...injects }) => {
		const rows = await send(places.tabs.tabRows, { at: await tabsAskOf({ injects, send }) });
		const titles = await pageTitlesOf(send, pageTabsOfRows(rows.tabs));
		return { ...rows, tabs: rows.tabs.map((tab) => titledTabOf(tab, titles)) };
	});

export const tabsSidebar = query()
	.public()
	.output(TabsSidebarSchema)
	.handle(async (_input, { send, ...injects }) => {
		const [at] = await Promise.all([tabsAskOf({ injects, send }), injects.essentials.essentialsLoaded()]);
		const essentials = essentialsOf(injects.essentials.essentials()).essentials;
		const sidebar = await send(places.tabs.sidebar, { at, essentials });
		return titledSidebarOf(sidebar, await pageTitlesOf(send, pageTabsOfSidebar(sidebar)));
	});

// TODO: a transport that cannot abort (Tauri IPC) leaves held-tabs stale after a dropped call
export const heldTabs = query()
	.public()
	.output(HeldTabsSchema)
	.handle(async (_input, { send, ...injects }) =>
		send(places.tabs.heldTabs, { at: await tabsAskOf({ injects, send }) }),
	);

export const canOpenOwnWindow = query()
	.public()
	.output(z.boolean())
	.handle(async (_input, { send }) => (await send(browser.tabs.browserTabs, ALL_PAGES)).canOpenOwnWindow);

export const restoreTabs = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send, emit, ...injects }) => {
		await readyToRestore(send, injects);
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabShowing.restoreTabs, {
				at,
				essentials: essentialsOf(injects.essentials.essentials()).essentials,
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

export const syncChatTabs = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { send, emit }) => {
		await sendKeepChatTabs(send);
		emit(tabsSettled);
	});

export const placeTab = command()
	.public()
	.input(z.object({ id: z.string(), to: TabDropSchema }))
	.idempotencyKey(Repeatable)
	.handle(async ({ id, to }, { send, emit, ...injects }) => {
		const reach = { injects, send, told: () => emit(tabsSettled) };

		if (to.kind === "essentials") {
			await makeEssential(reach, injects.essentials, { id, at: to.at });
			return;
		}

		await settleAsked(reach, placingOf(send, { id, to }));
	});

export const ensurePanePages = subscriber(layout.paneTree.panesChanged).handle(
	async (_input, { send, emit, invalidate, ...injects }) => {
		invalidateTabReads(invalidate);
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, (at) =>
			send(places.tabShowing.fitTabsToPanes, { at }),
		);
	},
);

export const rememberPages = subscriber(browser.browserPages.pagesChanged).handle(
	async (_input, { send, emit, ...injects }) => {
		await settleAsked({ injects, send, told: () => emit(tabsSettled) }, async (at) => {
			const settled = await send(places.tabShowing.rememberPages, { at });
			await rememberPageTitles(send, at);
			return settled;
		});
	},
);

export const keepChatTabs = subscriber(workspaces.chats.chatsChanged).handle(async (_input, { send, emit }) => {
	await sendKeepChatTabs(send);
	emit(tabsSettled);
});

export const rereadTabs = subscriber(tabsSettled).handle((_input, { invalidate }) => {
	invalidateTabReads(invalidate);
});

export const rereadTabsForCore = subscriber(studioCoreChanged).handle((_input, { invalidate }) => {
	invalidateTabReads(invalidate);
});

export const rereadTabsForPages = subscriber(browser.browserPages.pagesChanged).handle((_input, { invalidate }) => {
	invalidateTabReads(invalidate);
	invalidate(canOpenOwnWindow);
});

export const rereadTabsForAccessAsks = subscriber(browser.accessAsks.accessAsksChanged).handle(
	(_input, { invalidate }) => {
		invalidate(appTabs);
		invalidate(tabsSidebar);
	},
);

export const rereadTabsForInk = subscriber(browser.inkActivity.inkActivityChanged).handle((_input, { invalidate }) => {
	invalidate(appTabs);
	invalidate(tabsSidebar);
});

export const rereadTabsForChats = subscriber(workspaces.chats.chatsChanged).handle((_input, { invalidate }) => {
	invalidate(appTabs);
	invalidate(tabsSidebar);
});

export const rereadSidebarForEssentials = subscriber(essentialsChanged).handle((_input, { invalidate }) => {
	invalidate(tabsSidebar);
});

function invalidateTabReads(invalidate: (query: { readonly request: AnyQuery }) => void): void {
	invalidate(appTabs);
	invalidate(tabsSidebar);
	invalidate(heldTabs);
}

async function dropGoneTabPanes(send: Send, window: string): Promise<void> {
	const placed = await send(places.tabs.placedTabs, { window });
	const heldTabIds = placed.tabs.map(({ id }) => id);
	await sendLogged("drop the panes of gone tabs", () => send(layout.paneTabs.dropGoneTabs, { heldTabIds }));
}

async function readyToRestore(send: Send, injects: Pick<TabParts, "essentials" | "studioWindow">): Promise<void> {
	await injects.essentials.essentialsLoaded();
	await sendLogged("keep a tab for every chat", () => sendKeepChatTabs(send));

	if (!injects.studioWindow.opensBesideAnother()) {
		await dropGoneTabPanes(send, injects.studioWindow.windowLabel());
	}
}

function placingOf(send: Send, { id, to }: PlacedDrop): (at: TabsAsk) => Promise<TabsSettled> {
	if (to.kind === "list") {
		const place = { list: to.list, groupId: to.groupId, before: to.before };
		return (at) => send(places.tabPlacing.placeTab, { at, id, place });
	}

	if (to.kind === "split") {
		return (at) => send(places.splits.reorderSplitMember, { at, tabId: id, before: to.before });
	}

	return (at) => send(places.tabShowing.openTabInOwnWindow, { at, id });
}

async function makeEssential(
	reach: TabsReach,
	essentials: EssentialsGateway,
	{ id, at }: EssentialDrop,
): Promise<void> {
	await essentials.essentialsLoaded();
	const kept = essentialsOf(essentials.essentials());
	const face = await reach.send(places.tabPlacing.makeEssential, {
		at: await tabsAskOf(reach),
		id,
		essentialId: nextEssentialIdOf(kept),
	});
	saveEssentials(kept, addEssential(kept, face, at), essentials);
	reach.told();
}
