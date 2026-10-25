import type { AppTabState, ClosedTabRow, EssentialTile, TabsSidebar } from "@widgetarium/app-host";
import type { RecentSite } from "@widgetarium/browser";
import type { ChatElsewhereRow, ChatListData, ChatRowData, WorkspacesView } from "@widgetarium/workspaces";
import { hostOf } from "../../../shared/lib/address.js";
import type { Intent, RowAction, RowIcon, RowKind } from "../../../shared/schema/command-menu.schema.js";
import { chatActionsOf, openActionsOf, tabActionsOf, workspaceActionsOf } from "./row-actions.js";

export interface Found {
	readonly key: string;
	readonly kind: RowKind;
	readonly title: string;
	readonly meta: string;
	readonly haystack: string;
	readonly icon: RowIcon;
	readonly intent: Intent;
	readonly shortcut: string | null;
	readonly renames: { readonly kind: "tab" | "chat" | "workspace"; readonly id: string } | null;
	readonly actions: readonly RowAction[];
	readonly host: string;
	readonly isOnScreen: boolean;
}

const ON_SCREEN = "on screen";
const ESSENTIALS = "Essentials";
const PINNED = "Pinned";
const WORKING = "Working";
const UNREAD = "Done, not read";
const WORKSPACE = "Workspace";
const APP = "App";

export function tabsFoundOf(sidebar: TabsSidebar): readonly Found[] {
	const listed = sidebar.sections.flatMap((section) =>
		section.entries
			.flatMap((entry) => (entry.kind === "tab" ? [entry.tab] : entry.group.tabs))
			.map((tab) => tabFoundOf(tab, section.title)),
	);
	return [...sidebar.essentials.map(essentialFoundOf), ...listed];
}

export function chatsFoundOf({ pinned, recents }: ChatListData, onScreenIds: ReadonlySet<string>): readonly Found[] {
	return [...recents, ...pinned].map((row) => chatFoundOf(row, onScreenIds.has(row.id)));
}

export function workspacesFoundOf({ rows }: WorkspacesView): readonly Found[] {
	return rows.map((row) => ({
		key: `workspace:${row.id}`,
		kind: "workspace",
		title: row.name,
		meta: row.isCurrent ? `${WORKSPACE} · ${ON_SCREEN}` : WORKSPACE,
		haystack: row.name,
		icon: {
			kind: "letter",
			letter: letterOf(row.name),
			shape: "round",
		},
		intent: {
			do: "open-workspace",
			id: row.id,
			title: row.name,
		},
		shortcut: row.keyHint,
		renames: {
			kind: "workspace",
			id: row.id,
		},
		actions: workspaceActionsOf(),
		host: "",
		isOnScreen: row.isCurrent,
	}));
}

const MENU_APPS = [
	{
		app: "canvas",
		title: "Canvas",
		haystack: "canvas design board",
	},
	{
		app: "terminal",
		title: "Terminal",
		haystack: "terminal shell zsh console",
	},
] as const;

export function appsFoundOf(): readonly Found[] {
	return MENU_APPS.map(({ app, title, haystack }) => {
		const intent: Intent = {
			do: "open-app",
			app,
			title,
		};
		return {
			key: `app:${app}`,
			kind: "app",
			title,
			meta: APP,
			haystack,
			icon: tabIconOf(app, null, title, null),
			intent,
			shortcut: null,
			renames: null,
			actions: openActionsOf(intent),
			host: "",
			isOnScreen: false,
		};
	});
}

export function chatsElsewhereFoundOf(rows: readonly ChatElsewhereRow[]): readonly Found[] {
	return rows.map((row) => ({
		key: `elsewhere:${row.workspaceId}:${row.chatId}`,
		kind: "chat",
		title: row.title,
		meta: `In ${row.workspaceName}`,
		haystack: `${row.title} ${row.workspaceName}`,
		icon: {
			kind: "glyph",
			glyph: "chat",
		},
		intent: {
			do: "open-chat-elsewhere",
			workspaceId: row.workspaceId,
			chatId: row.chatId,
			title: row.title,
			workspaceName: row.workspaceName,
		},
		shortcut: null,
		renames: null,
		actions: [],
		host: "",
		isOnScreen: false,
	}));
}

export function closedFoundOf(closed: readonly ClosedTabRow[]): readonly Found[] {
	return closed.map((row) => ({
		key: `closed:${row.tabId}`,
		kind: "closed-tab",
		title: row.title,
		meta: hostOf(row.address),
		haystack: row.address,
		icon: tabIconOf(row.app, null, row.title, row.address),
		intent: {
			do: "reopen-closed",
			tabId: row.tabId,
			title: row.title,
		},
		shortcut: null,
		renames: null,
		actions: [],
		host: hostOf(row.address),
		isOnScreen: false,
	}));
}

export function sitesFoundOf(sites: readonly RecentSite[]): readonly Found[] {
	return sites.map((site) => {
		const intent: Intent = {
			do: "open-address",
			address: site.address,
			where: "new-tab",
		};
		return {
			key: `site:${site.host}`,
			kind: "site",
			title: site.host.replace(/^www\./, ""),
			meta: site.host,
			haystack: site.address,
			icon: tabIconOf("site", site.favicon, site.host, site.address),
			intent,
			shortcut: null,
			renames: null,
			actions: openActionsOf(intent),
			host: site.host.toLowerCase(),
			isOnScreen: false,
		};
	});
}

function tabFoundOf(tab: AppTabState, listTitle: string): Found {
	const host = tab.address === null ? "" : hostOf(tab.address);
	const where = [host, listTitle, tab.isShown ? ON_SCREEN : ""].filter((part) => part !== "");
	return {
		key: `tab:${tab.id}`,
		kind: "tab",
		title: tab.title,
		meta: where.join(" · "),
		haystack: [tab.address ?? "", tab.subtitle ?? "", tab.label ?? "", listTitle].join(" "),
		icon: tabIconOf(tab.icon, tab.favicon, tab.title, tab.address),
		intent: {
			do: "show-tab",
			id: tab.id,
			title: tab.title,
		},
		shortcut: null,
		renames: {
			kind: "tab",
			id: tab.id,
		},
		actions: tabActionsOf(tab.id, tab.title),
		host,
		isOnScreen: tab.isShown,
	};
}

function essentialFoundOf(tile: EssentialTile): Found {
	return {
		key: `essential:${tile.id}`,
		kind: "tab",
		title: tile.title,
		meta: tile.isShown ? `${ESSENTIALS} · ${ON_SCREEN}` : ESSENTIALS,
		haystack: ESSENTIALS,
		icon: tabIconOf(tile.icon, tile.favicon, tile.title, null),
		intent: {
			do: "show-essential",
			id: tile.id,
			title: tile.title,
		},
		shortcut: null,
		renames: null,
		actions: [],
		host: "",
		isOnScreen: tile.isShown,
	};
}

function chatFoundOf(row: ChatRowData, isOnScreen: boolean): Found {
	return {
		key: `chat:${row.id}`,
		kind: "chat",
		title: row.title,
		meta: chatMetaOf(row, isOnScreen),
		haystack: row.title,
		icon: {
			kind: "glyph",
			glyph: "chat",
		},
		intent: {
			do: "open-chat",
			id: row.id,
			title: row.title,
		},
		shortcut: null,
		renames: {
			kind: "chat",
			id: row.id,
		},
		actions: chatActionsOf(row.id, row.isPinned),
		host: "",
		isOnScreen,
	};
}

function chatMetaOf(row: ChatRowData, isOnScreen: boolean): string {
	const said = [
		row.isPinned ? PINNED : "",
		row.mark === "running" ? WORKING : "",
		row.mark === "unread" ? UNREAD : "",
		isOnScreen ? ON_SCREEN : "",
	];
	return said.filter((part) => part !== "").join(" · ");
}

function tabIconOf(art: string, favicon: string | null, title: string, address: string | null): RowIcon {
	return {
		kind: "tab",
		art,
		favicon,
		title,
		address,
	};
}

function letterOf(name: string): string {
	return name
		.replace(/^www\./, "")
		.trim()
		.charAt(0)
		.toUpperCase();
}
