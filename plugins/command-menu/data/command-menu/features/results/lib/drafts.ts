import type { Around, Draft, DraftedMenu, FilledPage, PageAsk, Pools, Typed } from "../../../shared/host/command-menu.host.js";
import type { Found } from "../../../shared/schema/command-menu.schema.js";
import { fallbackDraftOf, gridOf, jumpBackOf, listOf, poolOf, uncountedMenuOf } from "./draft-parts.js";
import { HOME_PAGE } from "./home-drafts.js";
import { addressFound, askFallbackFound, askFound, linkFound, searchFound } from "./made.js";
import { rankedOf } from "./match.js";

const FOUND_SHOWN = 8;
const OPENS_NEW = 2;
const ALREADY_OPEN = 3;
const RECENTLY_CLOSED = 5;
const SESSIONS_SHOWN = 4;
const SUGGESTED_BESIDE_SESSIONS = 3;
const SUMI_CHAT_KEY = "app:sumi-chat";
const SESSIONS_DOOR = "sessions";
const SESSIONS_LABEL = "Sessions";
const SUGGESTED_LABEL = "Suggested";
const SPLIT_LABEL = "Split";
const UNSPLIT = "Unsplit";
const NEW_SESSION = "New session";
const ALL_SESSIONS = "All {count} sessions";
const UNLABELLED = "";
const NEW_LABEL = "New";

export const BUILT_IN_PAGES: readonly FilledPage[] = [
	{
		id: "anywhere",
		draftsOf: anywherePageOf,
	},
	{
		id: "new-tab",
		draftsOf: newTabPageOf,
	},
	{
		id: "this-tab",
		draftsOf: thisTabPageOf,
	},
	HOME_PAGE,
	{
		id: SESSIONS_DOOR,
		draftsOf: sessionsPageOf,
	},
];

function anywherePageOf({ pools, findable, typed, around }: PageAsk): DraftedMenu {
	if (typed.lower === "") {
		return sessionsMenuOf(pools, around.splitTabIds);
	}

	return foundMenuOf({
		pools,
		findable,
		typed,
		around,
	});
}

function newTabPageOf({ pools, typed, around }: PageAsk): DraftedMenu {
	return newTabMenuOf(pools, typed, around);
}

function thisTabPageOf({ pools, typed, around }: PageAsk): DraftedMenu {
	return thisTabMenuOf(pools, typed, around);
}


function foundMenuOf({ pools, findable, typed, around }: PageAsk): DraftedMenu {
	const found = foundOf(pools, findable, typed);

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

function foundOf(pools: Pools, findable: readonly Found[], typed: Typed): readonly Found[] {
	const ranked = rankedOf(findable, typed.matched);
	const openTab = openTabOf(pools, typed);
	return openTab === null ? ranked : [openTab, ...ranked.filter((one) => one !== openTab)];
}

function openTabOf(pools: Pools, typed: Typed): Found | null {
	if (!typed.isAddress) {
		return null;
	}

	return poolOf(pools, "tabs").find((tab) => tab.host !== "" && tab.host === typed.host) ?? null;
}

function newRowsOf(typed: Typed, around: Around): readonly Found[] {
	return [opensTypedFound(typed, "new-tab", ""), askFound(typed.text, around.workspaceName)];
}

function sessionsMenuOf(pools: Pools, splitTabIds: readonly string[]): DraftedMenu {
	const sessions = poolOf(pools, "chats");
	const others = jumpBackOf(pools).filter(({ kind }) => kind !== "chat");
	const more = sessions.length > SESSIONS_SHOWN ? allSessionsOf(pools, sessions.length) : [];
	return uncountedMenuOf([
		listOf(SPLIT_LABEL, splitRowsOf(pools, splitTabIds)),
		listOf(SESSIONS_LABEL, [...newSessionOf(pools), ...sessions.slice(0, SESSIONS_SHOWN), ...more]),
		listOf(SUGGESTED_LABEL, others.slice(0, SUGGESTED_BESIDE_SESSIONS)),
	]);
}

function splitRowsOf(pools: Pools, splitTabIds: readonly string[]): readonly Found[] {
	const rows = [...poolOf(pools, "tabs"), ...poolOf(pools, "chats")];
	const members = splitTabIds.flatMap((id) => rows.filter(({ key }) => key === `tab:${id}` || key === `chat:${id}`));
	const first = members[0];
	return first === undefined ? [] : [...members, unsplitOf(first, splitTabIds)];
}

function unsplitOf(member: Found, tabIds: readonly string[]): Found {
	return {
		...member,
		key: "unsplit",
		title: UNSPLIT,
		meta: "",
		icon: { kind: "glyph", glyph: "unsplit" },
		intent: { do: "unsplit", tabIds, title: UNSPLIT },
		renames: null,
		actions: [],
		isOnScreen: false,
	};
}

function sessionsPageOf({ pools, typed }: PageAsk): DraftedMenu {
	const sessions = poolOf(pools, "chats");
	return uncountedMenuOf([
		listOf(UNLABELLED, [...newSessionOf(pools), ...(typed.lower === "" ? sessions : rankedOf(sessions, typed.matched))]),
	]);
}

function newSessionOf(pools: Pools): readonly Found[] {
	const sumiChat = poolOf(pools, "apps").find(({ key }) => key === SUMI_CHAT_KEY);
	return sumiChat === undefined
		? []
		: [{ ...sumiChat, key: "new-session", title: NEW_SESSION, meta: "", icon: { kind: "glyph", glyph: "plus" } }];
}

function allSessionsOf(pools: Pools, count: number): readonly Found[] {
	const title = ALL_SESSIONS.replace("{count}", String(count));
	return newSessionOf(pools).map((sumiChat) => ({
		...sumiChat,
		key: "all-sessions",
		title,
		icon: { kind: "glyph", glyph: "search" },
		intent: { do: "open-door", door: SESSIONS_DOOR, title },
	}));
}

function newTabMenuOf(pools: Pools, typed: Typed, around: Around): DraftedMenu {
	if (typed.lower === "") {
		return uncountedMenuOf([
			gridOf("Apps and sites", [...poolOf(pools, "apps"), ...poolOf(pools, "sites")]),
			listOf("Recently closed", poolOf(pools, "closed").slice(0, RECENTLY_CLOSED)),
		]);
	}

	return uncountedMenuOf([
		listOf(UNLABELLED, [...newTabOpensOf(pools, typed), askFound(typed.text, around.workspaceName)]),
	]);
}

function newTabOpensOf(pools: Pools, typed: Typed): readonly Found[] {
	if (typed.isSumiLink) {
		return [linkFound(typed.text, "new-tab", "")];
	}

	if (typed.isAddress) {
		return [addressFound(typed.text, "new-tab", "")];
	}

	return [
		...rankedOf(poolOf(pools, "apps"), typed.matched).slice(0, OPENS_NEW),
		...rankedOf(poolOf(pools, "sites"), typed.matched).slice(0, OPENS_NEW),
		searchFound(typed.text, "new-tab"),
	];
}

function thisTabMenuOf(pools: Pools, typed: Typed, around: Around): DraftedMenu {
	if (typed.lower === "") {
		return uncountedMenuOf([listOf("Go to", poolOf(pools, "sites").map(inThisTab))]);
	}

	return uncountedMenuOf(thisTabTypedDraftsOf(pools, typed, around));
}

function thisTabTypedDraftsOf(pools: Pools, typed: Typed, around: Around): readonly Draft[] {
	return [
		listOf(UNLABELLED, [opensTypedFound(typed, "this-tab", around.shownTitle)]),
		listOf("Already open", rankedOf(poolOf(pools, "tabs"), typed.matched).slice(0, ALREADY_OPEN)),
		fallbackDraftOf(UNLABELLED, [opensTypedFound(typed, "new-tab", ""), askFallbackFound(typed.text)]),
	];
}


function opensTypedFound(typed: Typed, where: "new-tab" | "this-tab", shownTitle: string): Found {
	if (typed.isSumiLink) {
		return linkFound(typed.text, where, shownTitle);
	}

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




