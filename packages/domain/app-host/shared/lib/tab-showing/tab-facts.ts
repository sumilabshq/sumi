import type { AccessAsk, BrowserTabState, BrowserTabs, InkReading } from "@widgetarium/browser";
import type { PaneBoard } from "@widgetarium/layout";
import type { PageFacts } from "../../schema/page-facts.schema.js";
import type { TabsSidebar } from "../../schema/app-tab.schema.js";

export type ChatOnScreen = TabsSidebar["chat"];

export interface TabPane {
	readonly paneId: string;
	readonly tabId: string;
}

export interface TabFacts {
	readonly pages: readonly PageFacts[];
	readonly isBrowserAvailable: boolean;
	readonly canOpenOwnWindow: boolean;
	readonly tabPanes: readonly TabPane[];
	readonly hasTabTarget: boolean;
	readonly tabTargetId: string | null;
	readonly chat: ChatOnScreen;
}

export interface FactSources {
	readonly browserTabs: BrowserTabs;
	readonly asks: readonly AccessAsk[];
	readonly board: PaneBoard;
	readonly chat: ChatOnScreen;
}

export function tabFactsOf({ browserTabs, asks, board, chat }: FactSources): TabFacts {
	return {
		pages: browserTabs.tabs.map((tab) => pageFactsOf(tab, browserTabs.inkReading, asks)),
		isBrowserAvailable: browserTabs.isAvailable,
		canOpenOwnWindow: browserTabs.canOpenOwnWindow,
		tabPanes: board.tabPanes,
		hasTabTarget: board.tabTargetId !== null,
		tabTargetId: board.tabTargetId,
		chat,
	};
}

export function tabIdsInPanesOf(facts: TabFacts): readonly string[] {
	return facts.tabPanes.map(({ tabId }) => tabId);
}

function pageFactsOf(tab: BrowserTabState, inkReading: InkReading | null, asks: readonly AccessAsk[]): PageFacts {
	return {
		pageId: tab.id,
		title: tab.title,
		url: tab.url,
		favicon: tab.favicon,
		isInkReading: inkReading?.tabId === tab.id,
		isAskWaiting: asks.some((ask) => ask.tabId === tab.id),
		isClosedToInk: tab.access?.decision === "deny",
		isInOwnWindow: tab.isInOwnWindow,
	};
}
