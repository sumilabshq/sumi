import type { Send } from "@widgetarium/core/requests";
import {
	AccessAsksQuery,
	BrowserTabsQuery,
	ClosePageCommand,
	FocusOwnWindowCommand,
	OpenAddressCommand,
	OpenPageCommand,
	OpenTabInOwnWindowCommand,
	ReloadPageCommand,
	ShowTabCommand as ShowBrowserPageCommand,
	TearOffCommand,
} from "@widgetarium/browser";
import {
	ClosePanesOfTabsCommand,
	CloseShownTabPaneCommand,
	OpenShownTabPaneCommand,
	PaneTreeQuery,
	ShowTabInTargetPaneCommand,
} from "@widgetarium/layout";
import { ActiveChatQuery } from "@widgetarium/workspaces";
import type { MovedEssentials } from "../essentials/essentials.js";
import { essentialsOf } from "../essentials/essentials.js";
import type { HostTab, HostTabsMoment, OpenedTab } from "../host-tabs/host-tabs.js";
import { keptTabsOf, momentOf, tabsTransitionSaid } from "../host-tabs/kept-tabs.js";
import type { KeptEssentials } from "../../schema/essential.schema.js";
import type { StudioView } from "../../schema/studio-view.schema.js";
import type { KeptTabs } from "../../schema/tabs-session.schema.js";
import { newTabPageOf } from "./new-tab-page.js";
import { showingOf, withTabPageOpened, withTabShown } from "./showing.js";
import type { Showing, TabEffect } from "./showing.js";
import { tabFactsOf } from "./tab-facts.js";
import type { TabFacts } from "./tab-facts.js";

export const NOT_HELD = 'the host holds no tab "{id}"';
export const NO_OWN_WINDOW = 'the tab "{id}" holds no page that can open in its own window';

const ALL_PAGES = { heldTabId: null };

interface HostTabsStore {
	tabsLoaded(): Promise<void>;
	tabs(): KeptTabs | null;
	saveTabs(tabs: KeptTabs, reason: string): void;
}

export interface EssentialsStore {
	essentialsLoaded(): Promise<void>;
	essentials(): KeptEssentials | null;
	saveEssentials(essentials: KeptEssentials, reason: string): void;
}

interface ShownViewStore {
	shownView(): StudioView;
	saveShownView(view: StudioView, reason: string): void;
}

interface PaneFlasher {
	flashPane(paneId: string): void;
}

export interface TabStores {
	readonly hostTabs: HostTabsStore;
	readonly essentials: EssentialsStore;
	readonly shownView: ShownViewStore;
	readonly paneFlash: PaneFlasher;
}

export interface TabsReach {
	readonly parts: TabStores;
	readonly send: Send;
}

export interface TabsNow {
	readonly showing: Showing;
	readonly kept: KeptEssentials;
}

export async function factsOf(parts: TabStores, send: Send): Promise<TabFacts> {
	const [browserTabs, asks, board, chat] = await Promise.all([
		send(BrowserTabsQuery, ALL_PAGES),
		send(AccessAsksQuery),
		send(PaneTreeQuery),
		send(ActiveChatQuery),
		parts.hostTabs.tabsLoaded(),
		parts.essentials.essentialsLoaded(),
	]);
	return tabFactsOf({ browserTabs, asks, board, chat });
}

export function tabsNowOf(parts: TabStores, facts: TabFacts): TabsNow {
	return {
		showing: showingOf(momentOf(parts.hostTabs.tabs(), facts.chat.id), parts.shownView.shownView()),
		kept: essentialsOf(parts.essentials.essentials()),
	};
}

export async function settle(was: Showing, next: Showing, { parts, send }: TabsReach): Promise<void> {
	saveShowing(was, next, parts);

	for (const effect of next.effects) {
		await sendLogged(effect.kind, () => sendEffect(effect, parts.paneFlash, send));
	}
}

export function saveEssentials(was: KeptEssentials, moved: MovedEssentials | null, essentials: EssentialsStore): void {
	if (moved === null) {
		return;
	}

	essentials.saveEssentials(moved.kept, moved.reason);
	console.info(`[widgetarium] essentials ${was.essentials.length} → ${moved.kept.essentials.length} (${moved.reason})`);
}

export async function sendLogged(what: string, sending: () => Promise<unknown> | void): Promise<void> {
	try {
		await sending();
	} catch (failure: unknown) {
		console.error(`[widgetarium] the host tabs could not ${what}`, failure);
	}
}

export function freshTabOf(app: OpenedTab["app"], facts: TabFacts): OpenedTab {
	return {
		app,
		pageId: newTabPageOf(app, facts.isBrowserAvailable),
	};
}

export function withOpenedTabShown(showing: Showing, facts: TabFacts, tab: HostTab, address: string): Showing {
	return withTabShown(withTabPageOpened(showing, tab, { address, isShown: true }), facts, tab);
}

export function liveTabOf(moment: HostTabsMoment, essentialId: string): HostTab | undefined {
	return moment.tabs.find((tab) => tab.essentialId === essentialId);
}

function saveShowing(was: Showing, next: Showing, { hostTabs, shownView }: TabStores): void {
	const reason = next.reasons.join("; ");

	if (next.moment !== was.moment) {
		hostTabs.saveTabs(keptTabsOf(next.moment), reason);
		console.info(`[widgetarium] ${tabsTransitionSaid(was.moment, next.moment, reason)}`);
	}

	if (next.shownView !== was.shownView) {
		shownView.saveShownView(next.shownView, reason);
		console.info(`[widgetarium] shown view ${was.shownView} → ${next.shownView} (${reason})`);
	}
}

async function sendEffect(effect: TabEffect, paneFlash: PaneFlasher, send: Send): Promise<unknown> {
	switch (effect.kind) {
		case "open-page":
			return send(OpenPageCommand, { tabId: effect.pageId });
		case "close-page":
			return send(ClosePageCommand, { tabId: effect.pageId });
		case "show-page":
			await send(OpenPageCommand, { tabId: effect.pageId });
			return send(ShowBrowserPageCommand, { tabId: effect.pageId });
		case "open-address":
			return send(OpenAddressCommand, {
				tabId: effect.pageId,
				address: effect.address,
				heldTabId: effect.isShown ? null : effect.pageId,
			});
		case "reload-page":
			return send(ReloadPageCommand, { tabId: effect.pageId });
		case "open-own-window":
			return send(OpenTabInOwnWindowCommand, { tabId: effect.pageId });
		case "focus-own-window":
			return send(FocusOwnWindowCommand, { tabId: effect.pageId });
		case "tear-off-page":
			return send(TearOffCommand, { tabId: effect.pageId });
		case "close-panes":
			return send(ClosePanesOfTabsCommand, { tabIds: effect.tabIds });
		case "open-shown-tab-pane":
			return send(OpenShownTabPaneCommand);
		case "close-shown-tab-pane":
			return send(CloseShownTabPaneCommand);
		case "show-in-target-pane":
			return send(ShowTabInTargetPaneCommand, { tabId: effect.tabId });
		case "flash-pane":
			return paneFlash.flashPane(effect.paneId);
	}
}
