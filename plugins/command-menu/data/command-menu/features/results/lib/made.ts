import { bareAddressOf } from "../../../shared/lib/address.js";
import type { Typed } from "../../../shared/host/command-menu.host.js";
import type { Found, Where } from "../../../shared/schema/command-menu.schema.js";

const NEW_TAB = "New tab";
const IN_THIS_TAB = "In this tab";

export function addressFound(typed: string, where: "new-tab" | "this-tab", instead: string): Found {
	const bare = bareAddressOf(typed);
	return madeOf({
		key: `address:${where}`,
		kind: "address",
		title: `Open ${bare}`,
		meta: where === "new-tab" ? NEW_TAB : insteadOf(instead),
		glyph: "globe",
		intent: {
			do: "open-address",
			address: typed,
			where,
		},
	});
}

export function linkFound(typed: string, where: "new-tab" | "this-tab", instead: string): Found {
	return madeOf({
		key: `link:${where}`,
		kind: "address",
		title: `Open ${typed}`,
		meta: where === "new-tab" ? NEW_TAB : insteadOf(instead),
		glyph: "globe",
		intent: {
			do: "open-link",
			href: typed,
			where,
		},
	});
}

export function searchFound(typed: string, where: "new-tab" | "this-tab"): Found {
	return madeOf({
		key: `search:${where}`,
		kind: "search",
		title: "Search the web",
		meta: where === "new-tab" ? NEW_TAB : IN_THIS_TAB,
		glyph: "search",
		intent: {
			do: "open-address",
			address: typed,
			where,
		},
	});
}

export function askFound(typed: string, workspaceName: string): Found {
	return madeOf({
		key: "ask",
		kind: "ask",
		title: "Ask Sumi",
		meta: workspaceName,
		glyph: "ink",
		intent: {
			do: "ask-ink",
			text: typed,
			sends: true,
		},
	});
}

export function askFallbackFound(typed: string): Found {
	return madeOf({
		key: "fallback:ask",
		kind: "ask",
		title: `Ask Sumi about “${typed}”`,
		meta: "",
		glyph: "ink",
		intent: {
			do: "ask-ink",
			text: typed,
			sends: true,
		},
	});
}

export function askAboutFound(typed: string): Found {
	return madeOf({
		key: "or:ask",
		kind: "ask",
		title: `Ask Sumi “${typed}”`,
		meta: "",
		glyph: "ink",
		intent: {
			do: "ask-ink",
			text: typed,
			sends: true,
		},
	});
}

export function searchForFound(typed: string, where: Where): Found {
	return madeOf({
		key: `or:search:${where}`,
		kind: "search",
		title: `Search the web for “${typed}”`,
		meta: "",
		glyph: "search",
		intent: {
			do: "open-address",
			address: typed,
			where,
		},
	});
}

export interface LinkWay {
	readonly typed: Typed;
	readonly where: Where;
	readonly title: string;
	readonly shortcut: string;
}

export function linkWayFound({ typed, where, title, shortcut }: LinkWay): Found {
	const found = madeOf({
		key: `link-way:${where}`,
		kind: "address",
		title,
		meta: "",
		glyph: where === "this-tab" ? "globe" : "plus",
		intent: typed.isSumiLink
			? {
					do: "open-link",
					href: typed.text,
					where,
				}
			: {
					do: "open-address",
					address: typed.text,
					where,
				},
	});
	return {
		...found,
		shortcut,
	};
}

interface Made {
	readonly key: string;
	readonly kind: Found["kind"];
	readonly title: string;
	readonly meta: string;
	readonly glyph: Extract<Found["icon"], { kind: "glyph" }>["glyph"];
	readonly intent: Found["intent"];
}

function madeOf({ key, kind, title, meta, glyph, intent }: Made): Found {
	return {
		key,
		kind,
		title,
		meta,
		haystack: "",
		icon: {
			kind: "glyph",
			glyph,
		},
		intent,
		shortcut: null,
		renames: null,
		actions: [],
		host: "",
		isOnScreen: false,
	};
}

function insteadOf(shownTitle: string): string {
	return shownTitle === "" ? IN_THIS_TAB : `${IN_THIS_TAB}, instead of ${shownTitle}`;
}
