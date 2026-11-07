import type { Found } from "@sumi/command-menu-plugin";

interface AskRow {
	readonly key: string;
	readonly title: string;
	readonly meta: string;
	readonly glyph: "ink" | "pencil";
	readonly text: string;
	readonly sends: boolean;
	readonly shortcut: string;
}

const ENTER = "↵";
const SHIFT_ENTER = "⇧↵";

export function createAndSendFound(typed: string): Found {
	return askRowOf({
		key: "ask:send",
		title: "Create and send",
		meta: "",
		glyph: "ink",
		text: typed,
		sends: true,
		shortcut: ENTER,
	});
}

export function createOnlyFound(typed: string): Found {
	return askRowOf({
		key: "ask:draft",
		title: "Create only",
		meta: "Don’t send",
		glyph: "pencil",
		text: typed,
		sends: false,
		shortcut: SHIFT_ENTER,
	});
}

export function createEmptyFound(): Found {
	return askRowOf({
		key: "ask:empty",
		title: "Create only",
		meta: "Empty chat",
		glyph: "pencil",
		text: "",
		sends: false,
		shortcut: ENTER,
	});
}

function askRowOf({ key, title, meta, glyph, text, sends, shortcut }: AskRow): Found {
	return {
		key,
		kind: "ask",
		title,
		meta,
		haystack: "",
		icon: {
			kind: "glyph",
			glyph,
		},
		intent: {
			do: "ask-ink",
			text,
			sends,
		},
		shortcut,
		renames: null,
		actions: [],
		host: "",
		isOnScreen: false,
	};
}
