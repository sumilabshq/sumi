import { query, subscriber } from "@widgetarium/core/requests";
import { AppTabsQuery, ClosedTabsQuery, TabsSidebarQuery } from "@widgetarium/app-host";
import { BrowserTabsQuery, PagesChangedEvent } from "@widgetarium/browser";
import { ChatListQuery, ChatsChangedEvent, ChatsElsewhereQuery, WorkspacesQuery } from "@widgetarium/workspaces";
import { CommandMenuChangedEvent } from "../../gateways/command-menu/command-menu.events.js";
import { ResultsAskSchema, ResultsSchema } from "../../shared/schema/command-menu.schema.js";
import { draftsOf } from "./lib/drafts.js";
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
import { commandsFound } from "./lib/made.js";
import { ghostOf, sectionsOf } from "./lib/sections.js";
import { askInkOf, makeNewLabelOf, makeNewOf, typedOf } from "./lib/typed.js";

const ALL_PAGES = { heldTabId: null };

export const CommandMenuResultsQuery = query("command-menu-results")
	.input(ResultsAskSchema)
	.output(ResultsSchema)
	.handle(async ({ text, scope, door }, { send }) => {
		const [sidebar, appTabs, closedTabs, chats, elsewhere, workspaces, browser] = await Promise.all([
			send(TabsSidebarQuery),
			send(AppTabsQuery),
			send(ClosedTabsQuery),
			send(ChatListQuery),
			send(ChatsElsewhereQuery),
			send(WorkspacesQuery),
			send(BrowserTabsQuery, ALL_PAGES),
		]);
		const pools: Pools = {
			tabs: tabsFoundOf(sidebar),
			chats: chatsFoundOf(chats),
			apps: appsFoundOf(),
			sites: sitesFoundOf(browser.recentSites),
			workspaces: workspacesFoundOf(workspaces),
			commands: commandsFound(),
			closed: closedFoundOf(closedTabs.tabs),
			elsewhere: chatsElsewhereFoundOf(elsewhere.rows),
		};
		const around: Around = {
			workspaceName: workspaces.current.name,
			shownTitle: appTabs.tabs.find((tab) => tab.isShown)?.title ?? "",
		};
		const typed = typedOf(text);
		const scoped = door === "anywhere" ? scope : "all";
		return {
			sections: [...sectionsOf(draftsOf({ door, scope, pools, typed, around }), typed.matched, door)],
			ghost: ghostOf(
				text.trim(),
				door,
				browser.recentSites.map((site) => site.host.toLowerCase()),
			),
			makeNew: makeNewOf(typed, scoped),
			makeNewLabel: makeNewLabelOf(scoped),
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
