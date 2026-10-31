import type { Door, Results } from "@widgetarium/command-menu";
import type { MenuMoves } from "./use-menu-moves.js";

export interface Hint {
	readonly keys: string;
	readonly said: string;
}

const HINTS_WITH_GHOST = 3;
const RENAME_HINTS: readonly Hint[] = [hintOf("↵", "Save name"), hintOf("esc", "Keep the old one")];
const ASK_HINT = hintOf("⌘↵", "Ask Sumi");
const RENAME_HINT = hintOf("⌘R", "Rename");
const ACTIONS_HINT = hintOf("→", "Actions");
const COMPLETE_HINT = hintOf("Tab", "Complete");

export function hintsOf(results: Results, moves: MenuMoves, door: Door): readonly Hint[] {
	if (moves.rename.key !== null) {
		return RENAME_HINTS;
	}

	const hints = [...enterHintsOf(results, moves, door), ...rowHintsOf(moves)];

	if (results.ghost === "") {
		return hints;
	}

	return [COMPLETE_HINT, ...hints.slice(0, HINTS_WITH_GHOST)];
}

function enterHintsOf(results: Results, moves: MenuMoves, door: Door): readonly Hint[] {
	const enter = hintOf("↵", moves.picked?.doLabel ?? "Open");

	if (door === "new-tab") {
		return [enter, ASK_HINT];
	}

	if (door === "ask") {
		return [enter, hintOf("⇧↵", results.fallbackLabel)];
	}

	return [enter, ASK_HINT, hintOf("⇧↵", results.fallbackLabel)];
}

function rowHintsOf(moves: MenuMoves): readonly Hint[] {
	const canRename = moves.picked !== null && moves.picked.renames !== null;
	return [...(canRename ? [RENAME_HINT] : []), ...(moves.hasActions ? [ACTIONS_HINT] : [])];
}

function hintOf(keys: string, said: string): Hint {
	return {
		keys,
		said,
	};
}
