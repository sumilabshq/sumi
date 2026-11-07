import type { AppFace, AppTabState, ChatMark, ClosedTabRow, EssentialTile, TabsSidebar } from "@widgetarium/app-host";
import type { RecentSite } from "@widgetarium/browser";
import type { ChatListData, ChatRowData } from "@widgetarium/app-host";
import type { ChatElsewhereRow, WorkspacesView } from "@widgetarium/workspaces";
import { hostOf } from "../../../shared/lib/address.js";
import type { Found, Intent, RowIcon } from "../../../shared/schema/command-menu.schema.js";
import { chatActionsOf, openActionsOf, tabActionsOf, workspaceActionsOf } from "./row-actions.js";
import { listedTabsOf } from "./sidebar-tabs.js";

interface ShownFace {
	readonly art: string;
	readonly favicon: string | null;
	readonly title: string;
	readonly address: string | null;
	readonly mark: ChatMark;
}

const ON_SCREEN = "on screen";
const ESSENTIALS = "Essentials";
const PINNED = "Pinned";
const WORKING = "Working";
const UNREAD = "Done, not read";
const WORKSPACE = "Workspace";
const APP = "App";
const NO_MARK = "none";
const UNKNOWN_ART = "site";
const CHAT_APP = "chat";
const SUMI_CHAT = "Sumi Chat";
const SUMI_CHAT_WORDS = "sumi chat new chat ask assistant";

export function tabsFoundOf(sidebar: TabsSidebar): readonly Found[] {
	const listed = listedTabsOf(sidebar).map(({ tab, listTitle }) => tabFoundOf(tab, listTitle));
	return [...sidebar.essentials.map(essentialFoundOf), ...listed];
}

export function chatsFoundOf(
	{ pinned, recents }: ChatListData,
	onScreenIds: ReadonlySet<string>,
	faces: readonly AppFace[],
): readonly Found[] {
	const art = artOf(faces, CHAT_APP);
	return [...recents, ...pinned].map((row) => chatFoundOf(row, onScreenIds.has(row.id), art));
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

const MENU_WORDS: ReadonlyMap<string, string> = new Map([
	["canvas", "canvas design board"],
	["terminal", "terminal shell zsh console"],
	["tasks", "tasks board kanban agents jira linear"],
]);

export function appsFoundOf(faces: readonly AppFace[]): readonly Found[] {
	const opened = faces.flatMap((face) => {
		const words = MENU_WORDS.get(face.app) ?? (face.isBuiltIn ? undefined : `${face.title} ${face.app} app`);
		return words === undefined || face.app === CHAT_APP ? [] : [appFoundOf(face, words)];
	});
	return [...opened, sumiChatFoundOf(artOf(faces, CHAT_APP))];
}

export function chatsElsewhereFoundOf(rows: readonly ChatElsewhereRow[], faces: readonly AppFace[]): readonly Found[] {
	const art = artOf(faces, CHAT_APP);
	return rows.map((row) => ({
		key: `elsewhere:${row.workspaceId}:${row.chatId}`,
		kind: "chat",
		title: row.title,
		meta: `In ${row.workspaceName}`,
		haystack: `${row.title} ${row.workspaceName}`,
		icon: iconOf({
			art,
			favicon: null,
			title: row.title,
			address: null,
			mark: NO_MARK,
		}),
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
		icon: iconOf({
			art: row.icon,
			favicon: row.favicon,
			title: row.title,
			address: row.address,
			mark: NO_MARK,
		}),
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
			icon: iconOf({
				art: UNKNOWN_ART,
				favicon: site.favicon,
				title: site.host,
				address: site.address,
				mark: NO_MARK,
			}),
			intent,
			shortcut: null,
			renames: null,
			actions: openActionsOf(intent),
			host: site.host.toLowerCase(),
			isOnScreen: false,
		};
	});
}

function sumiChatFoundOf(art: string): Found {
	return {
		key: "app:sumi-chat",
		kind: "app",
		title: SUMI_CHAT,
		meta: APP,
		haystack: SUMI_CHAT_WORDS,
		icon: iconOf({
			art,
			favicon: null,
			title: SUMI_CHAT,
			address: null,
			mark: NO_MARK,
		}),
		intent: {
			do: "run",
			command: "new-chat",
		},
		shortcut: null,
		renames: null,
		actions: [],
		host: "",
		isOnScreen: false,
	};
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
		icon: iconOf({
			art: tab.icon,
			favicon: tab.favicon,
			title: tab.title,
			address: tab.address,
			mark: tab.mark,
		}),
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
		icon: iconOf({
			art: tile.icon,
			favicon: tile.favicon,
			title: tile.title,
			address: null,
			mark: NO_MARK,
		}),
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

function chatFoundOf(row: ChatRowData, isOnScreen: boolean, art: string): Found {
	return {
		key: `chat:${row.id}`,
		kind: "chat",
		title: row.title,
		meta: chatMetaOf(row, isOnScreen),
		haystack: row.title,
		icon: iconOf({
			art,
			favicon: null,
			title: row.title,
			address: null,
			mark: row.mark,
		}),
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

function artOf(faces: readonly AppFace[], app: AppFace["app"]): string {
	return faces.find((face) => face.app === app)?.icon ?? UNKNOWN_ART;
}

function iconOf(face: ShownFace): RowIcon {
	return {
		kind: "tab",
		...face,
	};
}

function letterOf(name: string): string {
	return name
		.replace(/^www\./, "")
		.trim()
		.charAt(0)
		.toUpperCase();
}

function appFoundOf(face: AppFace, haystack: string): Found {
	const intent: Intent = {
		do: "open-app",
		app: face.app,
		title: face.title,
	};
	return {
		key: `app:${face.app}`,
		kind: "app",
		title: face.title,
		meta: APP,
		haystack,
		icon: iconOf({
			art: face.icon,
			favicon: face.favicon,
			title: face.title,
			address: null,
			mark: NO_MARK,
		}),
		intent,
		shortcut: null,
		renames: null,
		actions: openActionsOf(intent),
		host: "",
		isOnScreen: false,
	};
}
