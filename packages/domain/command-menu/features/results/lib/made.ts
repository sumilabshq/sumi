import { bareAddressOf } from "../../../shared/lib/address.js";
import type { MenuCommand } from "../../../shared/schema/command-menu.schema.js";
import type { Found } from "./found.js";

const COMMANDS: readonly (readonly [MenuCommand, string, string, "plus" | "reopen"])[] = [
	["new-chat", "New chat", "⌘N", "plus"],
	["new-tab", "New tab", "⌘T", "plus"],
	["reopen-tab", "Reopen closed tab", "⇧⌘T", "reopen"],
	["new-workspace", "New workspace", "", "plus"],
];
const NEW_TAB = "New tab";
const IN_THIS_TAB = "In this tab";

export function commandsFound(): readonly Found[] {
	return COMMANDS.map(([command, title, shortcut, glyph]) => ({
		key: `command:${command}`,
		kind: "command",
		title,
		meta: "",
		haystack: title,
		icon: {
			kind: "glyph",
			glyph,
		},
		intent: {
			do: "run",
			command,
		},
		shortcut: shortcut === "" ? null : shortcut,
		renames: null,
		actions: [],
		host: "",
		isOnScreen: false,
	}));
}

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

export function searchFound(typed: string, where: "new-tab" | "this-tab"): Found {
	return madeOf({
		key: `search:${where}`,
		kind: "search",
		title: `Search the web for “${typed}”`,
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
		title: `Ask Sumi “${typed}”`,
		meta: `New chat in ${workspaceName}`,
		glyph: "ink",
		intent: {
			do: "ask-ink",
			text: typed,
		},
	});
}

export function newChatFound(typed: string, workspaceName: string): Found {
	return madeOf({
		key: "new-chat",
		kind: "new-chat",
		title: `New chat “${typed}”`,
		meta: `In ${workspaceName}`,
		glyph: "plus",
		intent: {
			do: "new-chat",
			title: typed,
		},
	});
}

export function newWorkspaceFound(typed: string): Found {
	return madeOf({
		key: "new-workspace",
		kind: "new-workspace",
		title: `New workspace “${typed}”`,
		meta: "Empty, no chats yet",
		glyph: "plus",
		intent: {
			do: "new-workspace",
			name: typed,
		},
	});
}

interface Made {
	readonly key: string;
	readonly kind: Found["kind"];
	readonly title: string;
	readonly meta: string;
	readonly glyph: "globe" | "search" | "ink" | "plus";
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
