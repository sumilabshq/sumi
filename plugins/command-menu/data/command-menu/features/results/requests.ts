import { query, subscriber } from "#module";
import type { Send } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { chatTabs } from "@sumi/chat-tabs/contract";
import { apps as appsContract } from "@sumi/apps/contract";
import { browser as browserContract } from "@widgetarium/browser/contract";
import { workspaces as workspacesContract } from "@widgetarium/workspaces/contract";
import { layout } from "@widgetarium/layout/contract";
import { commandMenuChanged } from "../../gateways/command-menu/command-menu.events.js";
import type { FilledRowSource, Pools, RowsOf } from "../../shared/host/command-menu.host.js";
import { FoundSchema, ResultsAskSchema, ResultsSchema } from "../../shared/schema/command-menu.schema.js";
import type { Found, Results } from "../../shared/schema/command-menu.schema.js";
import {
	appsFoundOf,
	chatsElsewhereFoundOf,
	chatsFoundOf,
	closedFoundOf,
	layoutFoundOf,
	sitesFoundOf,
	tabsFoundOf,
	workspacesFoundOf,
} from "./lib/found.js";
import { shownChatIdsOf, shownSplitIdsOf } from "./lib/sidebar-tabs.js";
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

export const all = query()
	.public()
	.input(ResultsAskSchema)
	.output(ResultsSchema)
	.handle(async ({ text, door, pageId }, { menuFills, send }): Promise<Results> => {
		const page = [...menuFills.pages(), ...BUILT_IN_PAGES].find(({ id }) => id === door);
		const [sourced, appTabs, workspaces, browser, sidebar] = await Promise.all([
			Promise.all([...builtInSourcesOf(), ...menuFills.sources()].map((source) => sourcedRowsOf(source, send))),
			send(appHost.tabs.appTabs),
			send(workspacesContract.workspaces.all),
			send(browserContract.tabs.all, ALL_PAGES),
			send(appHost.tabs.tabsSidebar),
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
							splitTabIds: heldId === null ? shownSplitIdsOf(sidebar) : [],
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
			isLink: typed.isAddress || typed.isSumiLink,
			fallbackIntent: fallbackIntentOf(typed, door),
			fallbackLabel: fallbackLabelOf(typed, door),
			askInk: askInkOf(typed),
		};
	});

export const resultsOnMenuChanged = subscriber(commandMenuChanged).handle((_input, { invalidate }) => {
	invalidate(all);
});

export const resultsOnChatsChanged = subscriber(workspacesContract.chats.chatsChanged).handle(
	(_input, { invalidate }) => {
		invalidate(all);
	},
);

export const resultsOnPagesChanged = subscriber(browserContract.browserPages.pagesChanged).handle(
	(_input, { invalidate }) => {
		invalidate(all);
	},
);

const tabRowsOf: RowsOf = async (send) => tabsFoundOf(await send(appHost.tabs.tabsSidebar));

const chatRowsOf: RowsOf = async (send) => {
	const [sidebar, chats, apps] = await Promise.all([
		send(appHost.tabs.tabsSidebar),
		send(chatTabs.chatList.all),
		send(appsContract.apps.all),
	]);
	return chatsFoundOf(chats, shownChatIdsOf(sidebar), apps.apps);
};

const layoutRowsOf: RowsOf = async (send) => layoutFoundOf((await send(layout.frameSides.frameSides)).tabs);

const appRowsOf: RowsOf = async (send) => appsFoundOf((await send(appsContract.apps.all)).apps);

const siteRowsOf: RowsOf = async (send) => sitesFoundOf((await send(browserContract.tabs.all, ALL_PAGES)).recentSites);

const workspaceRowsOf: RowsOf = async (send) => workspacesFoundOf(await send(workspacesContract.workspaces.all));

const closedTabRowsOf: RowsOf = async (send) => closedFoundOf((await send(appHost.closedTabs.closedTabs)).tabs);

const chatElsewhereRowsOf: RowsOf = async (send) => {
	const [elsewhere, apps] = await Promise.all([
		send(workspacesContract.workspaces.chatsElsewhere),
		send(appsContract.apps.all),
	]);
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
		builtInSourceOf("layout", layoutRowsOf),
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
