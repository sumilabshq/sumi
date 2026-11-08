import { chatTabRowsOf } from "../../../shared/lib/tabs/chat-tabs.js";
import type { TabsAsk } from "../../../shared/schema/screen.schema.js";
import type { AppTabState, HeldTabs, PlacedSidebar, SidebarAsk } from "../../../shared/schema/tab-rows.schema.js";
import type { ChatTabs, PlacedTabs } from "../../../shared/schema/tabs.schema.js";
import { selectedIdsOf, tabRowsOf } from "../../../shared/lib/rows/tab-rows.js";
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
		tabs: tabRowsOf(moment, at.screen.pages, [WORKSPACE_LIST, ...chatIds]),
		canReopen: moment.closed.length > 0,
	};
}

export function sidebarAskOf(placed: PlacedTabs, apps: PlacedApps, { at, essentials }: SidebarAsk): SidebarRowsAsk {
	const moment = momentOfWindow(placed, at.window, apps);
	return {
		moment,
		essentials,
		pages: at.screen.pages,
		...paneLooksOf(moment, tabFactsOf(at.screen)),
	};
}

export function placedSidebarOf(placed: PlacedTabs, apps: PlacedApps, ask: SidebarAsk): PlacedSidebar {
	return sidebarOf(sidebarAskOf(placed, apps, ask));
}

export function heldTabsAt(placed: PlacedTabs, apps: PlacedApps, at: TabsAsk): HeldTabs {
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
		shownTabId: shownTabIdOf(moment, shownAppOf(moment.view)),
	};
}

export function chatTabsOf(placed: PlacedTabs, apps: PlacedApps): ChatTabs {
	const { pinned, open } = chatTabRowsOf({ ...placed, apps });
	return {
		pinned: [...pinned],
		open: [...open],
	};
}

function paneLooksOf(moment: HostTabsMoment, facts: TabFacts): Pick<SidebarRowsAsk, "highlightedIds" | "elsewhere"> {
	return {
		highlightedIds: selectedIdsOf(moment, facts),
		elsewhere: [...facts.tabWindows.keys()],
	};
}
