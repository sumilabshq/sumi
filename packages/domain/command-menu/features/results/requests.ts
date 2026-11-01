import { query, subscriber } from "@widgetarium/core/requests";
import { AppFacesQuery, AppTabsQuery, ChatListQuery, ClosedTabsQuery, TabsSidebarQuery } from "@widgetarium/app-host";
import { BrowserTabsQuery, PagesChangedEvent } from "@widgetarium/browser";
import { ChatsChangedEvent, ChatsElsewhereQuery, WorkspacesQuery } from "@widgetarium/workspaces";
import { CommandMenuChangedEvent } from "../../gateways/command-menu/command-menu.events.js";
import { ResultsAskSchema, ResultsSchema } from "../../shared/schema/command-menu.schema.js";
import { draftedMenuOf } from "./lib/drafts.js";
import type { Around, Pools } from "./lib/drafts.js";
import {
	appsFoundOf,
	chatsElsewhereFoundOf,
	chatsFoundOf,
	closedFoundOf,
	sitesFoundOf,
	tabsFoundOf,
	workspacesFoundOf,
} from "./lib/found.js";
import { shownChatIdsOf } from "./lib/sidebar-tabs.js";
import { ghostOf, sectionsOf } from "./lib/sections.js";
import { heldTabOfPage } from "../../shared/lib/held-tab.js";
import { askInkOf, fallbackLabelOf, fallbackIntentOf, typedOf } from "./lib/typed.js";

const ALL_PAGES = { heldTabId: null };

export const CommandMenuResultsQuery = query("command-menu-results")
	.input(ResultsAskSchema)
	.output(ResultsSchema)
	.handle(async ({ text, door, pageId }, { send }) => {
		const [sidebar, appTabs, closedTabs, chats, elsewhere, workspaces, browser, apps] = await Promise.all([
			send(TabsSidebarQuery),
			send(AppTabsQuery),
			send(ClosedTabsQuery),
			send(ChatListQuery),
			send(ChatsElsewhereQuery),
			send(WorkspacesQuery),
			send(BrowserTabsQuery, ALL_PAGES),
			send(AppFacesQuery),
		]);
		const pools: Pools = {
			tabs: tabsFoundOf(sidebar),
			chats: chatsFoundOf(chats, shownChatIdsOf(sidebar), apps.faces),
			apps: appsFoundOf(apps.faces),
			sites: sitesFoundOf(browser.recentSites),
			workspaces: workspacesFoundOf(workspaces),
			closed: closedFoundOf(closedTabs.tabs),
			elsewhere: chatsElsewhereFoundOf(elsewhere.rows, apps.faces),
		};
		const heldId = await heldTabOfPage(pageId, send);
		const around: Around = {
			workspaceName: workspaces.current.name,
			shownTitle: appTabs.tabs.find((tab) => (heldId === null ? tab.isShown : tab.id === heldId))?.title ?? "",
		};
		const typed = typedOf(text);
		const { foundCount, drafts } = draftedMenuOf({ door, pools, typed, around });
		return {
			door,
			foundCount,
			sections: [...sectionsOf(drafts, typed.matched, door)],
			ghost: ghostOf(
				door === "ask" ? "" : text.trim(),
				door,
				browser.recentSites.map((site) => site.host.toLowerCase()),
			),
			fallbackIntent: fallbackIntentOf(typed, door),
			fallbackLabel: fallbackLabelOf(typed, door),
			askInk: askInkOf(typed),
		};
	});

export const ResultsOnMenuChangedSubscriber = subscriber(CommandMenuChangedEvent).handle((_input, { invalidate }) => {
	invalidate(CommandMenuResultsQuery);
});

export const ResultsOnChatsChangedSubscriber = subscriber(ChatsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(CommandMenuResultsQuery);
});

export const ResultsOnPagesChangedSubscriber = subscriber(PagesChangedEvent).handle((_input, { invalidate }) => {
	invalidate(CommandMenuResultsQuery);
});
