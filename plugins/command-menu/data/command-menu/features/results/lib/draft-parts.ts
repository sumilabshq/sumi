import type { Draft, DraftedMenu, Pools } from "../../../shared/host/command-menu.host.js";
import type { Found } from "../../../shared/schema/command-menu.schema.js";

const RECENT_SHOWN = 8;

export function poolOf(pools: Pools, source: string): readonly Found[] {
	return pools[source] ?? [];
}

export function jumpBackOf(pools: Pools): readonly Found[] {
	const tabs = poolOf(pools, "tabs").filter((tab) => !tab.isOnScreen);
	const chats = poolOf(pools, "chats").filter((chat) => !chat.isOnScreen);
	const mixed = tabs.flatMap((tab, at) => [tab, ...(chats[at] === undefined ? [] : [chats[at]])]);
	return [...mixed, ...chats.slice(tabs.length)].slice(0, RECENT_SHOWN);
}

export function uncountedMenuOf(drafts: readonly Draft[]): DraftedMenu {
	return {
		foundCount: null,
		drafts,
	};
}

export function listOf(label: string, rows: readonly Found[]): Draft {
	return {
		label,
		layout: "list",
		rows,
		isFallback: false,
	};
}

export function gridOf(label: string, rows: readonly Found[]): Draft {
	return {
		label,
		layout: "grid",
		rows,
		isFallback: false,
	};
}

export function fallbackDraftOf(label: string, rows: readonly Found[]): Draft {
	return {
		label,
		layout: "list",
		rows,
		isFallback: true,
	};
}
