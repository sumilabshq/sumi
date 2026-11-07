import { query, subscriber } from "#module";
import type { Send } from "@widgetarium/data-framework";
import { AppTabsQuery, ClosedTabsQuery, TabsSidebarQuery } from "@widgetarium/app-host";
import { ChatListQuery } from "@sumi/chat-tabs";
import { AppsQuery } from "@sumi/apps";
import { BrowserTabsQuery, PagesChangedEvent } from "@widgetarium/browser";
import { ChatsChangedEvent, ChatsElsewhereQuery, WorkspacesQuery } from "@widgetarium/workspaces";
import { CommandMenuChangedEvent } from "../../gateways/command-menu/command-menu.events.js";
import type { FilledRowSource, Pools, RowsOf } from "../../shared/host/command-menu.host.js";
import { FoundSchema, ResultsAskSchema, ResultsSchema } from "../../shared/schema/command-menu.schema.js";
import type { Found, Results } from "../../shared/schema/command-menu.schema.js";
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
import { BUILT_IN_PAGES } from "./lib/drafts.js";
import { heldTabOfPage } from "../../shared/lib/held-tab.js";
import { askInkOf, fallbackLabelOf, fallbackIntentOf, typedOf } from "./lib/typed.js";

const ALL_PAGES = { heldTabId: null };
const FOUND_ROWS = FoundSchema.array();

interface SourcedRows {
	readonly source: FilledRowSource;
	readonly rows: readonly Found[];
}

export const CommandMenuResultsQuery = query("command-menu-results")
	.public()
	.input(ResultsAskSchema)
	.output(ResultsSchema)
	.handle(async ({ text, door, pageId }, { menuFills, send }): Promise<Results> => {
		const page = [...menuFills.pages(), ...BUILT_IN_PAGES].find(({ id }) => id === door);
		const [sourced, appTabs, workspaces, browser] = await Promise.all([
			Promise.all([...builtInSourcesOf(), ...menuFills.sources()].map((source) => sourcedRowsOf(source, send))),
			send(AppTabsQuery),
			send(WorkspacesQuery),
			send(BrowserTabsQuery, ALL_PAGES),
		]);
		const heldId = await heldTabOfPage(pageId, send);
		const typed = typedOf(text);
		const { foundCount, drafts } =
			page === undefined
				? unfilledPageOf(door)
				: page.draftsOf({
						pools: poolsOf(sourced),
						findable: sourced.filter(({ source }) => source.isFindable).flatMap(({ rows }) => rows),
						typed,
						around: {
							workspaceName: workspaces.current.name,
							shownTitle: appTabs.tabs.find((tab) => (heldId === null ? tab.isShown : tab.id === heldId))?.title ?? "",
						},
					});
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

const tabRowsOf: RowsOf = async (send) => tabsFoundOf(await send(TabsSidebarQuery));

const chatRowsOf: RowsOf = async (send) => {
	const [sidebar, chats, apps] = await Promise.all([send(TabsSidebarQuery), send(ChatListQuery), send(AppsQuery)]);
	return chatsFoundOf(chats, shownChatIdsOf(sidebar), apps.apps);
};

const appRowsOf: RowsOf = async (send) => appsFoundOf((await send(AppsQuery)).apps);

const siteRowsOf: RowsOf = async (send) => sitesFoundOf((await send(BrowserTabsQuery, ALL_PAGES)).recentSites);

const workspaceRowsOf: RowsOf = async (send) => workspacesFoundOf(await send(WorkspacesQuery));

const closedTabRowsOf: RowsOf = async (send) => closedFoundOf((await send(ClosedTabsQuery)).tabs);

const chatElsewhereRowsOf: RowsOf = async (send) => {
	const [elsewhere, apps] = await Promise.all([send(ChatsElsewhereQuery), send(AppsQuery)]);
	return chatsElsewhereFoundOf(elsewhere.rows, apps.apps);
};

function builtInSourcesOf(): readonly FilledRowSource[] {
	return [
		builtInSourceOf("tabs", tabRowsOf),
		builtInSourceOf("chats", chatRowsOf),
		builtInSourceOf("apps", appRowsOf),
		builtInSourceOf("sites", siteRowsOf),
		builtInSourceOf("workspaces", workspaceRowsOf),
		{
			...builtInSourceOf("closed", closedTabRowsOf),
			isFindable: false,
		},
		builtInSourceOf("elsewhere", chatElsewhereRowsOf),
	];
}

function builtInSourceOf(id: string, rowsOf: RowsOf): FilledRowSource {
	return {
		id,
		isFindable: true,
		rowsOf,
	};
}

async function sourcedRowsOf(source: FilledRowSource, send: Send): Promise<SourcedRows> {
	const parsed = FOUND_ROWS.safeParse(await source.rowsOf(send));

	if (!parsed.success) {
		console.error(`[widgetarium] command menu skipped row source ${source.id}: ${parsed.error.message}`);
		return {
			source,
			rows: [],
		};
	}

	return {
		source,
		rows: parsed.data,
	};
}

function poolsOf(sourced: readonly SourcedRows[]): Pools {
	return Object.fromEntries(sourced.map(({ source, rows }) => [source.id, rows]));
}

function unfilledPageOf(door: string): { readonly foundCount: null; readonly drafts: readonly [] } {
	console.error(`[widgetarium] command menu has no page for door ${door}`);
	return {
		foundCount: null,
		drafts: [],
	};
}
