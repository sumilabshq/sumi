import type { Results } from "@widgetarium/command-menu";
import type { MenuMoves } from "./use-menu-moves.js";

export interface Hint {
	readonly keys: string;
	readonly said: string;
}

const HINTS_WITH_GHOST = 3;

export function hintsOf(results: Results, moves: MenuMoves): readonly Hint[] {
	if (moves.rename.key !== null) {
		return [
			{
				keys: "↵",
				said: "Save name",
			},
			{
				keys: "esc",
				said: "Keep the old one",
			},
		];
	}

	const picked = moves.picked;
	const hints: Hint[] = [
		{
			keys: "↵",
			said: picked?.doLabel ?? "Open",
		},
		{
			keys: "⇧↵",
			said: results.makeNewLabel,
		},
		{
			keys: "⌘↵",
			said: "Ask Sumi",
		},
	];

	if (picked !== null && picked.renames !== null) {
		hints.push({
			keys: "⌘R",
			said: "Rename",
		});
	}

	if (moves.hasActions) {
		hints.push({
			keys: "→",
			said: "Actions",
		});
	}

	if (results.ghost !== "") {
		return [
			{
				keys: "Tab",
				said: "Complete",
			},
			...hints.slice(0, HINTS_WITH_GHOST),
		];
	}

	return hints;
}
