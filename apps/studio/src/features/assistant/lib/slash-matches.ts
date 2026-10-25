import type { SlashName } from "@widgetarium/assistant";

export type SlashKind = "command" | "skill";

export interface SlashEntry {
	readonly name: string;
	readonly said: string;
	readonly icon: string;
	readonly aliases: readonly string[];
	readonly kind: SlashKind;
}

export interface SlashAsk {
	readonly matches: readonly SlashEntry[];
	readonly start: number;
	readonly end: number;
}

export interface SaidPiece {
	readonly text: string;
	readonly isCommand: boolean;
}

const COMMAND_ENTRIES: Readonly<Record<SlashName, SlashEntry>> = {
	clear: {
		name: "clear",
		said: "New chat. This one stays in your history",
		icon: "message-square-plus",
		aliases: ["new", "reset"],
		kind: "command",
	},
	compact: {
		name: "compact",
		said: "Summarize the chat to free up context",
		icon: "fold-vertical",
		aliases: ["summarize"],
		kind: "command",
	},
};

export const SKILL_ENTRIES: readonly SlashEntry[] = [
	{
		name: "create-app",
		said: "Describe it in a sentence. Sumi writes the code and runs it",
		icon: "code-xml",
		aliases: ["new-app"],
		kind: "skill",
	},
	{
		name: "design-app",
		said: "Screens and look first, drawn on the canvas. No code yet",
		icon: "layout-panel-left",
		aliases: ["screens"],
		kind: "skill",
	},
];

const ASKED_BEFORE_CARET = /(^|\s)\/([a-z-]*)$/i;
const SLASH_WORD = /(^|\s)(\/[a-z-]+)(?=\s|$)/gi;

export function slashEntriesOf(names: readonly SlashName[]): readonly SlashEntry[] {
	return [...names.map((name) => COMMAND_ENTRIES[name]), ...SKILL_ENTRIES];
}

export function slashAskOf(entries: readonly SlashEntry[], draft: string, caret: number): SlashAsk | null {
	const before = draft.slice(0, caret);
	const asked = ASKED_BEFORE_CARET.exec(before);
	const typed = asked?.[2];

	if (asked === null || typed === undefined) {
		return null;
	}

	const start = before.length - typed.length - 1;
	const isAtStart = start === 0;
	const offered = isAtStart ? entries : entries.filter(({ kind }) => kind === "skill");
	const matches = offered.filter(({ name, aliases }) =>
		[name, ...aliases].some((word) => word.startsWith(typed.toLowerCase())),
	);

	if (!isAtStart && matches.length === 0) {
		return null;
	}

	return {
		matches,
		start,
		end: caret,
	};
}

export function saidPiecesOf(entries: readonly SlashEntry[], draft: string): readonly SaidPiece[] | null {
	const pieces: SaidPiece[] = [];
	let cursor = 0;

	for (const found of draft.matchAll(SLASH_WORD)) {
		const word = found[2] ?? "";
		const at = (found.index ?? 0) + (found[1] ?? "").length;

		if (isKnownAt(entries, word, at)) {
			pieces.push({ text: draft.slice(cursor, at), isCommand: false });
			pieces.push({ text: word, isCommand: true });
			cursor = at + word.length;
		}
	}

	if (cursor === 0) {
		return null;
	}

	pieces.push({ text: draft.slice(cursor), isCommand: false });
	return pieces.filter(({ text }) => text !== "");
}

function isKnownAt(entries: readonly SlashEntry[], word: string, at: number): boolean {
	const entry = entries.find(({ name }) => `/${name}` === word.toLowerCase());

	if (entry === undefined) {
		return false;
	}

	return entry.kind === "skill" || at === 0;
}
