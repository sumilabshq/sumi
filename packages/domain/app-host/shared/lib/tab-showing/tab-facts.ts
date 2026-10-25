import type { AccessAsk, BrowserTabState, BrowserTabs, InkReading } from "@widgetarium/browser";
import type { PaneBoard } from "@widgetarium/layout";
import type { PageFacts } from "../../schema/page-facts.schema.js";
export interface TabPane {
	readonly paneId: string;
	readonly tabId: string;
}

export interface TabFacts {
	readonly pages: readonly PageFacts[];
	readonly isBrowserAvailable: boolean;
	readonly canOpenOwnWindow: boolean;
	readonly tabPanes: readonly TabPane[];
	readonly shownTabPaneId: string | null;
	readonly hasTabTarget: boolean;
	readonly tabTargetId: string | null;
	readonly chatGroupIds: readonly string[];
	readonly tabWindows: ReadonlyMap<string, string>;
	readonly groupOfPane: ReadonlyMap<string, string>;
	readonly focusedChatId: string | null;
}

export interface FactSources {
	readonly browserTabs: BrowserTabs;
	readonly asks: readonly AccessAsk[];
	readonly board: PaneBoard;
}

export function tabFactsOf({ browserTabs, asks, board }: FactSources): TabFacts {
	return {
		pages: browserTabs.tabs.map((tab) => pageFactsOf(tab, browserTabs.inkReading, asks)),
		isBrowserAvailable: browserTabs.isAvailable,
		canOpenOwnWindow: browserTabs.canOpenOwnWindow,
		tabPanes: board.tabPanes,
		shownTabPaneId: board.leaves.find((leaf) => leaf.view.kind === "app" && leaf.view.tabId === null)?.id ?? null,
		hasTabTarget: board.tabTargetId !== null,
		tabTargetId: board.tabTargetId,
		chatGroupIds: board.chatGroups.map((group) => group.chatId),
		groupOfPane: new Map(
			board.chatGroups.flatMap(({ chatId, paneIds }) => paneIds.map((paneId) => [paneId, chatId] as const)),
		),
		tabWindows: new Map(board.elsewhere.flatMap(({ window, tabIds }) => tabIds.map((id) => [id, window] as const))),
		focusedChatId: board.focusedChatId,
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
