import { CHAT_SKILLS } from "@sumi/chat-plugin";
import type { SlashName } from "@widgetarium/assistant/contract";

interface EntryWords {
	readonly description: string;
	readonly aliases: readonly string[];
}

export type SlashEntry =
	| (EntryWords & { readonly kind: "command"; readonly name: SlashName })
	| (EntryWords & { readonly kind: "skill"; readonly name: string });

export interface SlashQuery {
	readonly matches: readonly SlashEntry[];
	readonly start: number;
	readonly end: number;
}

interface KnownWord {
	readonly word: string;
	readonly startIndex: number;
}

export interface CommandPiece {
	readonly text: string;
	readonly isCommand: boolean;
}

const COMMAND_ENTRIES: Readonly<Record<SlashName, SlashEntry>> = {
	clear: {
		kind: "command",
		name: "clear",
		description: "New chat, this one stays in your history",
		aliases: ["new", "reset"],
	},
	compact: {
		kind: "command",
		name: "compact",
		description: "Summarize the chat to free up context",
		aliases: ["summarize"],
	},
};

const SKILL_ENTRIES: readonly SlashEntry[] = CHAT_SKILLS.map(({ name, description, aliases }) => ({
	kind: "skill",
	name,
	description,
	aliases,
}));

const SLASH_QUERY_BEFORE_CARET = /(^|\s)\/([a-z-]*)$/i;
const SLASH_WORD = /(^|\s)(\/[a-z-]+)(?=\s|$)/gi;

export function slashEntriesOf(names: readonly SlashName[]): readonly SlashEntry[] {
	return [...names.map((name) => COMMAND_ENTRIES[name]), ...SKILL_ENTRIES];
}

export function slashQueryAt(entries: readonly SlashEntry[], draft: string, caret: number): SlashQuery | null {
	const before = draft.slice(0, caret);
	const typed = SLASH_QUERY_BEFORE_CARET.exec(before)?.[2];

	if (typed === undefined) {
		return null;
	}

	const start = before.length - typed.length - 1;
	const isAtStart = start === 0;
	const matches = matchesOf(entries, typed, isAtStart);

	if (!isAtStart && matches.length === 0) {
		return null;
	}

	return {
		matches,
		start,
		end: caret,
	};
}

export function commandPiecesOf(entries: readonly SlashEntry[], draft: string): readonly CommandPiece[] | null {
	const words = knownWordsIn(entries, draft);

	if (words.length === 0) {
		return null;
	}

	const pieces: CommandPiece[] = [];
	let cursor = 0;

	for (const { word, startIndex } of words) {
		pieces.push({ text: draft.slice(cursor, startIndex), isCommand: false });
		pieces.push({ text: word, isCommand: true });
		cursor = startIndex + word.length;
	}

	pieces.push({ text: draft.slice(cursor), isCommand: false });
	return pieces.filter(({ text }) => text !== "");
}

function matchesOf(entries: readonly SlashEntry[], typed: string, isAtStart: boolean): readonly SlashEntry[] {
	const offered = isAtStart ? entries : entries.filter(({ kind }) => kind === "skill");
	return offered.filter(({ name, aliases }) => [name, ...aliases].some((word) => word.startsWith(typed.toLowerCase())));
}

function knownWordsIn(entries: readonly SlashEntry[], draft: string): readonly KnownWord[] {
	return [...draft.matchAll(SLASH_WORD)]
		.map((found) => ({
			word: found[2] ?? "",
			startIndex: (found.index ?? 0) + (found[1] ?? "").length,
		}))
		.filter(({ word, startIndex }) => isKnownAt(entries, word, startIndex));
}

function isKnownAt(entries: readonly SlashEntry[], word: string, startIndex: number): boolean {
	const entry = entries.find(({ name }) => `/${name}` === word.toLowerCase());
	return entry !== undefined && (entry.kind === "skill" || startIndex === 0);
}
