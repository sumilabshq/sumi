import type {
	Around,
	Draft,
	DraftedMenu,
	FilledPage,
	PageAsk,
	Pools,
	Typed,
} from "../../../shared/host/command-menu.host.js";
import type { Found } from "../../../shared/schema/command-menu.schema.js";
import {
	addressFound,
	askFallbackFound,
	askFound,
	createAndSendFound,
	createEmptyFound,
	createOnlyFound,
	linkFound,
	searchFound,
} from "./made.js";
import { rankedOf } from "./match.js";

const FOUND_SHOWN = 8;
const RECENT_SHOWN = 8;
const OPENS_NEW = 2;
const ALREADY_OPEN = 3;
const RECENTLY_CLOSED = 5;
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
	{
		id: "ask",
		draftsOf: askPageOf,
	},
];

function anywherePageOf({ pools, findable, typed, around }: PageAsk): DraftedMenu {
	if (typed.lower === "") {
		return suggestedMenuOf(pools);
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

function askPageOf({ typed }: PageAsk): DraftedMenu {
	return askingMenuOf(typed);
}

function poolOf(pools: Pools, source: string): readonly Found[] {
	return pools[source] ?? [];
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

function suggestedMenuOf(pools: Pools): DraftedMenu {
	return uncountedMenuOf([listOf(UNLABELLED, jumpBackOf(pools))]);
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

function askingMenuOf(typed: Typed): DraftedMenu {
	if (typed.text === "") {
		return uncountedMenuOf([listOf(UNLABELLED, [createEmptyFound()])]);
	}

	return uncountedMenuOf([
		listOf(UNLABELLED, [createAndSendFound(typed.text)]),
		fallbackDraftOf(UNLABELLED, [createOnlyFound(typed.text)]),
	]);
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

function jumpBackOf(pools: Pools): readonly Found[] {
	const tabs = poolOf(pools, "tabs").filter((tab) => !tab.isOnScreen);
	const chats = poolOf(pools, "chats").filter((chat) => !chat.isOnScreen);
	const mixed = tabs.flatMap((tab, at) => [tab, ...(chats[at] === undefined ? [] : [chats[at]])]);
	return [...mixed, ...chats.slice(tabs.length)].slice(0, RECENT_SHOWN);
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
