import { parse } from "yaml";
import { findBlocks } from "@widgetarium/core/block-writer.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import type { Board } from "@widgetarium/core/model.js";

type BoardInNote =
	| { readonly kind: "board"; readonly board: Board }
	| { readonly kind: "none" }
	| { readonly kind: "refused"; readonly refusal: string };

const NOT_A_BOARD = "its widgetarium block cannot be read: {why}";

export function boardIn(text: string): BoardInNote {
	const lines = text.split("\n");
	const [block] = findBlocks(lines);
	if (!block) return { kind: "none" };
	try {
		return { kind: "board", board: normalizeBoard(parse(lines.slice(block.start + 1, block.end).join("\n"))) };
	} catch (failure) {
		const why = failure instanceof Error ? failure.message : String(failure);
		return { kind: "refused", refusal: NOT_A_BOARD.replace("{why}", why) };
	}
}

export function boardOrRefused(read: BoardInNote, note: string): Board | null {
	if (read.kind === "refused") throw new Error(`${note}: ${read.refusal}`);
	return read.kind === "board" ? read.board : null;
}
