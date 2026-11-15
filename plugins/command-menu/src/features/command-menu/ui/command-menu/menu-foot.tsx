import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Door, Results } from "@sumi/command-menu/contract";
import { hintsOf } from "../../lib/menu-hints.js";
import type { MenuMoves } from "../../lib/use-menu-moves.js";
import { MenuToast } from "./menu-toast.js";

export interface MenuFootProps {
	readonly door: Door;
	readonly text: string;
	readonly results: Results;
	readonly moves: MenuMoves;
}

const ESC = "esc";

export function MenuFoot({ door, text, results, moves }: MenuFootProps): ReactElement {
	if (moves.toast !== "") {
		return (
			<div className="wg-cm-foot">
				<MenuToast moves={moves} />
			</div>
		);
	}

	return (
		<div className="wg-cm-foot">
			{hintsOf(results, moves, door).map((hint) => (
				<span key={hint.keys} className="wg-cm-hint">
					<kbd className="wg-cm-kbd">{hint.keys}</kbd>
					{hint.said}
				</span>
			))}
			<span className="wg-cm-hint">
				<kbd className="wg-cm-kbd">{ESC}</kbd>
				{escSaidOf(door, text)}
			</span>
		</div>
	);
}

function escSaidOf(door: Door, text: string): string {
	if (text !== "") {
		return "Clear";
	}

	return door === "this-tab" ? "Back" : "Close";
}
