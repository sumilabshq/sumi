import { chatTabRowsOf } from "../../../shared/lib/tabs/chat-tabs.js";
import type { Screen, TabsAsk } from "../../../shared/schema/screen.schema.js";
import type { AppTabState, HeldTab, PlacedSidebar, SidebarAsk } from "../../../shared/schema/tab-rows.schema.js";
import type { ChatTabs, PlacedTabs } from "../../../shared/schema/tabs.schema.js";
import { tabRowsOf } from "../../../shared/lib/rows/tab-rows.js";
import { sidebarOf } from "../../../shared/lib/rows/sidebar-rows.js";
import type { SidebarRowsAsk } from "../../../shared/lib/rows/sidebar-rows.js";
import { shownAppOf, shownTabIdOf } from "../../../shared/lib/showing/showing.js";
import { tabFactsOf } from "../../../shared/lib/showing/tab-facts.js";
import type { TabFacts } from "../../../shared/lib/showing/tab-facts.js";
import { tabPagesOf } from "../../../shared/lib/showing/tab-pages.js";
import { isPageTab } from "../../../shared/lib/tabs/host-tabs.js";
import { momentOfWindow } from "../../../shared/lib/tabs/kept-tabs.js";
import type { HostTabsMoment } from "../../../shared/lib/tabs/host-tabs.js";
import { WORKSPACE_LIST } from "../../../shared/lib/tabs/tab-lists.js";
import type { PlacedApps } from "../../../shared/lib/tabs/app-abilities.js";

export function rowsAt(
	placed: PlacedTabs,
	apps: PlacedApps,
	at: TabsAsk,
): { readonly tabs: readonly AppTabState[]; readonly canReopen: boolean } {
	const moment = momentOfWindow(placed, at.window, apps);
	const chatIds = at.screen.chatGroups.map((group) => group.chatId);
	return {
		tabs: tabRowsOf(moment, at.screen.pages, shownAppOf(at.view), [WORKSPACE_LIST, ...chatIds]),
		canReopen: moment.closed.length > 0,
	};
}

export function sidebarAskOf(placed: PlacedTabs, apps: PlacedApps, { at, essentials }: SidebarAsk): SidebarRowsAsk {
	const moment = momentOfWindow(placed, at.window, apps);
	return {
		moment,
		essentials,
		pages: at.screen.pages,
		shownApp: shownAppOf(at.view),
		shownTileRowId: shownTileRowIdOf(moment, at.screen),
		...paneLooksOf(tabFactsOf(at.screen)),
	};
}

export function placedSidebarOf(placed: PlacedTabs, apps: PlacedApps, ask: SidebarAsk): PlacedSidebar {
	return sidebarOf(sidebarAskOf(placed, apps, ask));
}

export function heldTabsAt(
	placed: PlacedTabs,
	apps: PlacedApps,
	at: TabsAsk,
): { readonly tabs: readonly HeldTab[]; readonly shownTabId: string | null } {
	const moment = momentOfWindow(placed, at.window, apps);
	const pages = tabPagesOf(moment.tabs, at.screen.pages);
	return {
		tabs: moment.tabs
			.filter((tab) => isPageTab(apps, tab))
			.map((tab) => ({
				id: tab.id,
				app: tab.app,
				label: tab.label,
				pageId: pages.get(tab.id)?.pageId ?? null,
				address: tab.lastAddress,
			})),
		shownTabId: shownTabIdOf(moment, shownAppOf(at.view)),
	};
}

export function chatTabsOf(placed: PlacedTabs, apps: PlacedApps): ChatTabs {
	const { pinned, open } = chatTabRowsOf({ ...placed, apps });
	return {
		pinned: [...pinned],
		open: [...open],
	};
}

function paneLooksOf(facts: TabFacts): Pick<SidebarRowsAsk, "hasShownTabPane" | "elsewhere"> {
	return {
		hasShownTabPane: facts.shownTabPaneId !== null,
		elsewhere: [...facts.tabWindows.keys()],
	};
}

function shownTileRowIdOf(moment: HostTabsMoment, screen: Screen): string | null {
	const chatId = screen.focusedChatId;

	if (chatId === null) {
		return null;
	}

	const paneIds = screen.chatGroups.find((group) => group.chatId === chatId)?.paneIds ?? [];
	const artifactIds = screen.tabPanes.filter((pane) => paneIds.includes(pane.paneId)).map((pane) => pane.tabId);
	return artifactIds.find((id) => id === moment.lastShown[chatId]) ?? artifactIds[0] ?? chatId;
}
