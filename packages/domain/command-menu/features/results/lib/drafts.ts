import type { Door, Scope } from "../../../shared/schema/command-menu.schema.js";
import type { Found } from "./found.js";
import { addressFound, askFound, newChatFound, newWorkspaceFound, searchFound } from "./made.js";
import { bestOf, rankedOf } from "./match.js";

export interface Draft {
	readonly label: string;
	readonly layout: "list" | "grid";
	readonly rows: readonly Found[];
	readonly isMakeNew: boolean;
}

export interface Pools {
	readonly tabs: readonly Found[];
	readonly chats: readonly Found[];
	readonly apps: readonly Found[];
	readonly sites: readonly Found[];
	readonly workspaces: readonly Found[];
	readonly commands: readonly Found[];
	readonly closed: readonly Found[];
	readonly elsewhere: readonly Found[];
}

export interface Typed {
	readonly text: string;
	readonly lower: string;
	readonly isAddress: boolean;
	readonly host: string;
	readonly matched: string;
}

export interface Around {
	readonly workspaceName: string;
	readonly shownTitle: string;
}

const JUMP_BACK = 5;
const COMMANDS_SHOWN = 3;
const SCOPE_SHOWN = 9;
const SCOPE_FOUND = 8;
const ALREADY_OPEN = 3;
const RECENTLY_CLOSED = 5;
const OPENS_NEW = 2;
const SCOPE_LABEL: Readonly<Record<Exclude<Scope, "all">, string>> = {
	tabs: "Tabs",
	chats: "Chats",
	apps: "Apps",
	workspaces: "Workspaces",
};

export interface DraftsAsk {
	readonly door: Door;
	readonly scope: Scope;
	readonly pools: Pools;
	readonly typed: Typed;
	readonly around: Around;
}

export function draftsOf({ door, scope, pools, typed, around }: DraftsAsk): readonly Draft[] {
	if (door === "new-tab") {
		return newTabDraftsOf(pools, typed, around);
	}

	if (door === "this-tab") {
		return thisTabDraftsOf(pools, typed, around);
	}

	if (typed.lower === "") {
		return untypedJumpDraftsOf(pools, scope);
	}

	if (scope !== "all") {
		return [
			listOf(SCOPE_LABEL[scope], rankedOf(scopePoolOf(pools, scope), typed.matched).slice(0, SCOPE_FOUND)),
			makeNewOf([scopeMadeOf(scope, typed, around), askFound(typed.text, around.workspaceName)]),
		];
	}

	return jumpEverywhereDraftsOf(pools, typed, around);
}

function untypedJumpDraftsOf(pools: Pools, scope: Scope): readonly Draft[] {
	if (scope === "all") {
		return [listOf("Jump back in", jumpBackOf(pools)), listOf("Commands", pools.commands.slice(0, COMMANDS_SHOWN))];
	}

	return [listOf(SCOPE_LABEL[scope], scopePoolOf(pools, scope).slice(0, SCOPE_SHOWN))];
}

function jumpEverywhereDraftsOf(pools: Pools, typed: Typed, around: Around): readonly Draft[] {
	const lists: readonly (readonly [string, readonly Found[], number])[] = [
		[typed.isAddress ? "Already open" : "Tabs", rankedOf(pools.tabs, typed.matched), 4],
		["Chats", rankedOf(pools.chats, typed.matched), 3],
		["Apps", rankedOf([...pools.apps, ...pools.sites], typed.matched), 2],
		["Workspaces", rankedOf(pools.workspaces, typed.matched), 2],
		["In other workspaces", rankedOf(pools.elsewhere, typed.matched), 3],
		["Commands", rankedOf(pools.commands, typed.matched), 2],
	];
	const opened = opensTypedFound(typed, "new-tab", "");
	const topHit = topHitOf(pools, typed);
	const isOpenedOnTop = topHit === null && typed.isAddress;
	const top = isOpenedOnTop ? opened : topHit;
	return [
		...(top === null ? [] : [listOf(isOpenedOnTop ? "Open" : "Top hit", [top])]),
		...lists.map(([label, ranked, shown]) => listOf(label, ranked.filter((one) => one !== top).slice(0, shown))),
		makeNewOf([...(isOpenedOnTop ? [] : [opened]), askFound(typed.text, around.workspaceName)]),
	];
}

function newTabDraftsOf(pools: Pools, typed: Typed, around: Around): readonly Draft[] {
	if (typed.lower === "") {
		return [
			gridOf("Apps and sites", [...pools.apps, ...pools.sites]),
			listOf("Recently closed", pools.closed.slice(0, RECENTLY_CLOSED)),
		];
	}

	const opens = typed.isAddress
		? [addressFound(typed.text, "new-tab", "")]
		: [
				...rankedOf(pools.apps, typed.matched).slice(0, OPENS_NEW),
				...rankedOf(pools.sites, typed.matched).slice(0, OPENS_NEW),
			];
	const search = searchFound(typed.text, "new-tab");
	return [
		listOf("Open in a new tab", opens.length === 0 ? [search] : opens),
		listOf("Already open", rankedOf(pools.tabs, typed.matched).slice(0, ALREADY_OPEN)),
		makeNewOf([...(typed.isAddress || opens.length === 0 ? [] : [search]), askFound(typed.text, around.workspaceName)]),
	];
}

function thisTabDraftsOf(pools: Pools, typed: Typed, around: Around): readonly Draft[] {
	if (typed.lower === "") {
		return [listOf("Go to", pools.sites.map(inThisTab))];
	}

	return [
		listOf("In this tab", [opensTypedFound(typed, "this-tab", around.shownTitle)]),
		listOf("Already open", rankedOf(pools.tabs, typed.matched).slice(0, ALREADY_OPEN)),
		makeNewOf([opensTypedFound(typed, "new-tab", ""), askFound(typed.text, around.workspaceName)]),
	];
}

function topHitOf(pools: Pools, typed: Typed): Found | null {
	if (typed.isAddress) {
		return pools.tabs.find((tab) => tab.host !== "" && tab.host === typed.host) ?? null;
	}

	return bestOf(
		[pools.tabs, pools.chats, pools.apps, pools.sites, pools.workspaces, pools.elsewhere, pools.commands],
		typed.matched,
	);
}

function jumpBackOf(pools: Pools): readonly Found[] {
	const tabs = pools.tabs.filter((tab) => !tab.isOnScreen);
	const chats = pools.chats.filter((chat) => !chat.isOnScreen);
	const mixed = tabs.flatMap((tab, at) => [tab, ...(chats[at] === undefined ? [] : [chats[at]])]);
	return [...mixed, ...chats.slice(tabs.length)].slice(0, JUMP_BACK);
}

function scopePoolOf(pools: Pools, scope: Exclude<Scope, "all">): readonly Found[] {
	if (scope === "apps") {
		return [...pools.apps, ...pools.sites];
	}

	if (scope === "chats") {
		return [...pools.chats, ...pools.elsewhere];
	}

	return pools[scope];
}

function scopeMadeOf(scope: Exclude<Scope, "all">, typed: Typed, around: Around): Found {
	if (scope === "chats") {
		return newChatFound(typed.text, around.workspaceName);
	}

	if (scope === "workspaces") {
		return newWorkspaceFound(typed.text);
	}

	return opensTypedFound(typed, "new-tab", "");
}

function opensTypedFound(typed: Typed, where: "new-tab" | "this-tab", shownTitle: string): Found {
	return typed.isAddress ? addressFound(typed.text, where, shownTitle) : searchFound(typed.text, where);
}

function inThisTab(site: Found): Found {
	if (site.intent.do !== "open-address") {
		return site;
	}

	return {
		...site,
		key: `here:${site.key}`,
		intent: {
			...site.intent,
			where: "this-tab",
		},
		actions: [],
	};
}

function listOf(label: string, rows: readonly Found[]): Draft {
	return {
		label,
		layout: "list",
		rows,
		isMakeNew: false,
	};
}

function gridOf(label: string, rows: readonly Found[]): Draft {
	return {
		label,
		layout: "grid",
		rows,
		isMakeNew: false,
	};
}

function makeNewOf(rows: readonly Found[]): Draft {
	return {
		label: "Make new",
		layout: "list",
		rows,
		isMakeNew: true,
	};
}
