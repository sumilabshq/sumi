import type { AssistantCall, CallChange, DiffLine, DiffSign } from "@widgetarium/core/engine/assistant-port.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { shortPathOf } from "./tools.js";

interface TextReplacement {
	readonly was: string;
	readonly now: string;
}

interface LineDiff {
	readonly added: number;
	readonly removed: number;
	readonly lines: readonly DiffLine[];
}

const MOST_LINES_SHOWN = 40;
const CREATED = "File created successfully";
const NO_LINE_DIFF: LineDiff = { added: 0, removed: 0, lines: [] };

export function callChangeOf(call: AssistantCall): CallChange | null {
	const file = call.input["file_path"];
	if (typeof file !== "string" || !call.answered || call.failed) {
		return null;
	}

	const change = linesChangeOf(call);
	if (!change) {
		return null;
	}

	return { file: shortPathOf(file), ...change, lines: change.lines.slice(0, MOST_LINES_SHOWN) };
}

export function changeOfReplacement({ was, now }: TextReplacement): LineDiff {
	const before = splitLines(was);
	const after = splitLines(now);
	const head = sharedHeadOf(before, after);
	const keptUntil = before.length - sharedTailOf(before.slice(head), after.slice(head));
	const removed = before.slice(head, keptUntil);
	const added = after.slice(head, after.length - (before.length - keptUntil));
	const lines = [
		...signedLines("kept", before.slice(Math.max(0, head - 1), head)),
		...signedLines("removed", removed),
		...signedLines("added", added),
		...signedLines("kept", before.slice(keptUntil, keptUntil + 1)),
	];
	return { added: added.length, removed: removed.length, lines };
}

function signedLines(sign: DiffSign, texts: readonly string[]): DiffLine[] {
	return texts.map((text) => ({ sign, text }));
}

function mergedChanges(held: LineDiff, next: LineDiff): LineDiff {
	return {
		added: held.added + next.added,
		removed: held.removed + next.removed,
		lines: [...held.lines, ...next.lines],
	};
}

function sharedHeadOf(before: readonly string[], after: readonly string[]): number {
	let at = 0;
	while (at < before.length && at < after.length && before[at] === after[at]) {
		at += 1;
	}

	return at;
}

function sharedTailOf(before: readonly string[], after: readonly string[]): number {
	let from = 0;
	while (
		from < before.length &&
		from < after.length &&
		before[before.length - 1 - from] === after[after.length - 1 - from]
	) {
		from += 1;
	}

	return from;
}

function splitLines(text: string): string[] {
	return text === "" ? [] : text.replace(/\n$/, "").split("\n");
}

function linesChangeOf({ name, input, output }: AssistantCall): LineDiff | null {
	if (name === "Edit") {
		return input["replace_all"] === true ? null : changeOfReplacement(replacementOf(input));
	}

	if (name === "MultiEdit") {
		return multiEditChangeOf(input["edits"]);
	}

	if (name === "Write" && output.startsWith(CREATED)) {
		return createdChangeOf(input["content"]);
	}

	return null;
}

function multiEditChangeOf(edits: unknown): LineDiff | null {
	if (!Array.isArray(edits)) {
		return null;
	}

	const each = edits.filter(isObject);
	if (each.some((edit) => edit["replace_all"] === true)) {
		return null;
	}

	return each.map((edit) => changeOfReplacement(replacementOf(edit))).reduce(mergedChanges, NO_LINE_DIFF);
}

function createdChangeOf(content: unknown): LineDiff | null {
	if (typeof content !== "string") {
		return null;
	}

	const lines = splitLines(content);
	return { added: lines.length, removed: 0, lines: signedLines("added", lines) };
}

function replacementOf(edit: Readonly<Record<string, unknown>>): TextReplacement {
	const was = edit["old_string"];
	const now = edit["new_string"];
	return { was: typeof was === "string" ? was : "", now: typeof now === "string" ? now : "" };
}
