import { bareAddressOf } from "../../../shared/lib/address.js";
import type { Found } from "../../../shared/schema/command-menu.schema.js";

const NEW_TAB = "New tab";
const IN_THIS_TAB = "In this tab";
const ENTER = "↵";
const SHIFT_ENTER = "⇧↵";

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

export function createAndSendFound(typed: string): Found {
	return {
		...madeOf({
			key: "ask:send",
			kind: "ask",
			title: "Create and send",
			meta: "",
			glyph: "ink",
			intent: {
				do: "ask-ink",
				text: typed,
				sends: true,
			},
		}),
		shortcut: ENTER,
	};
}

export function createOnlyFound(typed: string): Found {
	return {
		...madeOf({
			key: "ask:draft",
			kind: "ask",
			title: "Create only",
			meta: "Don’t send",
			glyph: "pencil",
			intent: {
				do: "ask-ink",
				text: typed,
				sends: false,
			},
		}),
		shortcut: SHIFT_ENTER,
	};
}

export function createEmptyFound(): Found {
	return {
		...madeOf({
			key: "ask:empty",
			kind: "ask",
			title: "Create only",
			meta: "Empty chat",
			glyph: "pencil",
			intent: {
				do: "ask-ink",
				text: "",
				sends: false,
			},
		}),
		shortcut: ENTER,
	};
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
