import { chatTabRowsOf } from "../../../shared/lib/tabs/chat-tabs.js";
import type { TabsAsk } from "../../../shared/schema/screen.schema.js";
import type { AppTabState, HeldTab, PlacedSidebar, SidebarAsk } from "../../../shared/schema/tab-rows.schema.js";
import type { ChatTabs, PlacedTabs } from "../../../shared/schema/tabs.schema.js";
import { tabRowsOf } from "../../../shared/lib/rows/tab-rows.js";
import { sidebarOf } from "../../../shared/lib/rows/sidebar-rows.js";
import type { SidebarRowsAsk } from "../../../shared/lib/rows/sidebar-rows.js";
import { shownAppOf, shownTabIdOf } from "../../../shared/lib/showing/showing.js";
import { tabFactsOf, tabIdsInPanesOf } from "../../../shared/lib/showing/tab-facts.js";
import type { TabFacts } from "../../../shared/lib/showing/tab-facts.js";
import { tabPagesOf } from "../../../shared/lib/showing/tab-pages.js";
import { isPageTab } from "../../../shared/lib/tabs/host-tabs.js";
import { momentOfWindow } from "../../../shared/lib/tabs/kept-tabs.js";
import { WORKSPACE_LIST } from "../../../shared/lib/tabs/tab-lists.js";

export function rowsAt(
	placed: PlacedTabs,
	at: TabsAsk,
): { readonly tabs: readonly AppTabState[]; readonly canReopen: boolean } {
	const moment = momentOfWindow(placed, at.window);
	const chatIds = at.screen.chatGroups.map((group) => group.chatId);
	return {
		tabs: tabRowsOf(moment, at.screen.pages, shownAppOf(at.view), [WORKSPACE_LIST, ...chatIds]),
		canReopen: moment.closed.length > 0,
	};
}

export function sidebarAskOf(placed: PlacedTabs, { at, essentials }: SidebarAsk): SidebarRowsAsk {
	return {
		moment: momentOfWindow(placed, at.window),
		essentials,
		pages: at.screen.pages,
		shownApp: shownAppOf(at.view),
		boardChatIds: at.screen.chatGroups.map((group) => group.chatId),
		...paneLooksOf(tabFactsOf(at.screen)),
	};
}

export function placedSidebarOf(placed: PlacedTabs, ask: SidebarAsk): PlacedSidebar {
	return sidebarOf(sidebarAskOf(placed, ask));
}

export function heldTabsAt(
	placed: PlacedTabs,
	at: TabsAsk,
): { readonly tabs: readonly HeldTab[]; readonly shownTabId: string | null } {
	const moment = momentOfWindow(placed, at.window);
	const pages = tabPagesOf(moment.tabs, at.screen.pages);
	return {
		tabs: moment.tabs.filter(isPageTab).map((tab) => ({
			id: tab.id,
			app: tab.app,
			label: tab.label,
			pageId: pages.get(tab.id)?.pageId ?? null,
		})),
		shownTabId: shownTabIdOf(moment, shownAppOf(at.view)),
	};
}

export function chatTabsOf(placed: PlacedTabs): ChatTabs {
	const { pinned, open } = chatTabRowsOf(placed);
	return {
		pinned: [...pinned],
		open: [...open],
	};
}

function paneLooksOf(facts: TabFacts): Pick<SidebarRowsAsk, "inPanes" | "hasShownTabPane" | "elsewhere"> {
	return {
		inPanes: tabIdsInPanesOf(facts),
		hasShownTabPane: facts.shownTabPaneId !== null,
		elsewhere: [...facts.tabWindows.keys()],
	};
}
