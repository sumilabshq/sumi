import type { AccessAsk, BrowserTabState, BrowserTabs, InkReading } from "@widgetarium/browser";
import type { PaneBoard } from "@widgetarium/layout";
import type { PageFacts, Screen } from "@widgetarium/places";

export interface ScreenSources {
	readonly browserTabs: BrowserTabs;
	readonly asks: readonly AccessAsk[];
	readonly board: PaneBoard;
}

export function screenOf({ browserTabs, asks, board }: ScreenSources): Screen {
	return {
		pages: browserTabs.tabs.map((tab) => pageFactsOf(tab, browserTabs.inkReading, asks)),
		isBrowserAvailable: browserTabs.isAvailable,
		canOpenOwnWindow: browserTabs.canOpenOwnWindow,
		tabPanes: board.tabPanes.map(({ paneId, tabId }) => ({ paneId, tabId })),
		shownTabPaneId: board.leaves.find((leaf) => leaf.view.kind === "app" && leaf.view.tabId === null)?.id ?? null,
		tabTargetId: board.tabTargetId,
		chatGroups: board.chatGroups.map(({ chatId, paneIds }) => ({ chatId, paneIds: [...paneIds] })),
		elsewhere: board.elsewhere.map(({ window, tabIds, chatIds }) => ({ window, tabIds: [...tabIds, ...chatIds] })),
		focusedChatId: board.focusedChatId,
	};
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
