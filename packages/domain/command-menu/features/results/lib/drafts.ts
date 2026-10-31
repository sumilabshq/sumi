import type { Door } from "../../../shared/schema/command-menu.schema.js";
import type { Found } from "./found.js";
import { addressFound, askFallbackFound, askFound, createAndSendFound, createOnlyFound, searchFound } from "./made.js";
import { rankedOf } from "./match.js";

export interface Draft {
	readonly label: string;
	readonly layout: "list" | "grid";
	readonly rows: readonly Found[];
	readonly isFallback: boolean;
}

export interface Pools {
	readonly tabs: readonly Found[];
	readonly chats: readonly Found[];
	readonly apps: readonly Found[];
	readonly sites: readonly Found[];
	readonly workspaces: readonly Found[];
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

export interface DraftsAsk {
	readonly door: Door;
	readonly pools: Pools;
	readonly typed: Typed;
	readonly around: Around;
}

export interface DraftedMenu {
	readonly foundCount: number | null;
	readonly drafts: readonly Draft[];
}

const FOUND_SHOWN = 8;
const RECENT_SHOWN = 8;
const OPENS_NEW = 2;
const ALREADY_OPEN = 3;
const RECENTLY_CLOSED = 5;
const UNLABELLED = "";
const NEW_LABEL = "New";
const FINDABLE: readonly (keyof Pools)[] = ["tabs", "chats", "apps", "sites", "workspaces", "elsewhere"];

export function draftedMenuOf({ door, pools, typed, around }: DraftsAsk): DraftedMenu {
	if (door === "ask") {
		return askingMenuOf(typed);
	}

	if (door === "new-tab") {
		return newTabMenuOf(pools, typed, around);
	}

	if (door === "this-tab") {
		return thisTabMenuOf(pools, typed, around);
	}

	if (typed.lower === "") {
		return suggestedMenuOf(pools);
	}

	return foundMenuOf(pools, typed, around);
}

function foundMenuOf(pools: Pools, typed: Typed, around: Around): DraftedMenu {
	const found = foundOf(pools, typed);

	if (found.length === 0) {
		return {
			foundCount: 0,
			drafts: [fallbackDraftOf(NEW_LABEL, newRowsOf(typed, around))],
		};
	}

	return {
		foundCount: found.length,
		drafts: [listOf(UNLABELLED, found.slice(0, FOUND_SHOWN))],
	};
}

function foundOf(pools: Pools, typed: Typed): readonly Found[] {
	const ranked = rankedOf(
		FINDABLE.flatMap((pool) => pools[pool]),
		typed.matched,
	);
	const openTab = openTabOf(pools, typed);
	return openTab === null ? ranked : [openTab, ...ranked.filter((one) => one !== openTab)];
}

function openTabOf(pools: Pools, typed: Typed): Found | null {
	if (!typed.isAddress) {
		return null;
	}

	return pools.tabs.find((tab) => tab.host !== "" && tab.host === typed.host) ?? null;
}

function newRowsOf(typed: Typed, around: Around): readonly Found[] {
	return [opensTypedFound(typed, "new-tab", ""), askFound(typed.text, around.workspaceName)];
}

function suggestedMenuOf(pools: Pools): DraftedMenu {
	return uncountedMenuOf([listOf(UNLABELLED, jumpBackOf(pools))]);
}

function newTabMenuOf(pools: Pools, typed: Typed, around: Around): DraftedMenu {
	if (typed.lower === "") {
		return uncountedMenuOf([
			gridOf("Apps and sites", [...pools.apps, ...pools.sites]),
			listOf("Recently closed", pools.closed.slice(0, RECENTLY_CLOSED)),
		]);
	}

	return uncountedMenuOf([
		listOf(UNLABELLED, [...newTabOpensOf(pools, typed), askFound(typed.text, around.workspaceName)]),
	]);
}

function newTabOpensOf(pools: Pools, typed: Typed): readonly Found[] {
	if (typed.isAddress) {
		return [addressFound(typed.text, "new-tab", "")];
	}

	return [
		...rankedOf(pools.apps, typed.matched).slice(0, OPENS_NEW),
		...rankedOf(pools.sites, typed.matched).slice(0, OPENS_NEW),
		searchFound(typed.text, "new-tab"),
	];
}

function askingMenuOf(typed: Typed): DraftedMenu {
	if (typed.text === "") {
		return uncountedMenuOf([]);
	}

	return uncountedMenuOf([
		listOf(UNLABELLED, [createAndSendFound(typed.text)]),
		fallbackDraftOf(UNLABELLED, [createOnlyFound(typed.text)]),
	]);
}

function thisTabMenuOf(pools: Pools, typed: Typed, around: Around): DraftedMenu {
	if (typed.lower === "") {
		return uncountedMenuOf([listOf("Go to", pools.sites.map(inThisTab))]);
	}

	return uncountedMenuOf(thisTabTypedDraftsOf(pools, typed, around));
}

function thisTabTypedDraftsOf(pools: Pools, typed: Typed, around: Around): readonly Draft[] {
	return [
		listOf(UNLABELLED, [opensTypedFound(typed, "this-tab", around.shownTitle)]),
		listOf("Already open", rankedOf(pools.tabs, typed.matched).slice(0, ALREADY_OPEN)),
		fallbackDraftOf(UNLABELLED, [opensTypedFound(typed, "new-tab", ""), askFallbackFound(typed.text)]),
	];
}

function jumpBackOf(pools: Pools): readonly Found[] {
	const tabs = pools.tabs.filter((tab) => !tab.isOnScreen);
	const chats = pools.chats.filter((chat) => !chat.isOnScreen);
	const mixed = tabs.flatMap((tab, at) => [tab, ...(chats[at] === undefined ? [] : [chats[at]])]);
	return [...mixed, ...chats.slice(tabs.length)].slice(0, RECENT_SHOWN);
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

function uncountedMenuOf(drafts: readonly Draft[]): DraftedMenu {
	return {
		foundCount: null,
		drafts,
	};
}

function listOf(label: string, rows: readonly Found[]): Draft {
	return {
		label,
		layout: "list",
		rows,
		isFallback: false,
	};
}

function gridOf(label: string, rows: readonly Found[]): Draft {
	return {
		label,
		layout: "grid",
		rows,
		isFallback: false,
	};
}

function fallbackDraftOf(label: string, rows: readonly Found[]): Draft {
	return {
		label,
		layout: "list",
		rows,
		isFallback: true,
	};
}
