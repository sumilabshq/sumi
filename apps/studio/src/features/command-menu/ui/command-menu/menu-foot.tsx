import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { Door, Results } from "@widgetarium/command-menu";
import { hintsOf } from "../../lib/menu-hints.js";
import type { MenuMoves } from "../../lib/use-menu-moves.js";

export interface MenuFootProps {
	readonly door: Door;
	readonly text: string;
	readonly results: Results;
	readonly moves: MenuMoves;
}

const ESC = "esc";

export function MenuFoot({ door, text, results, moves }: MenuFootProps): ReactElement {
	return (
		<div className="wg-cm-foot">
			{moves.toast === "" ? (
				hintsOf(results, moves, door).map((hint) => (
					<span key={hint.keys} className="wg-cm-hint">
						<kbd className="wg-cm-kbd">{hint.keys}</kbd>
						{hint.said}
					</span>
				))
			) : (
				<span className="wg-cm-toast" role="status" data-warning={moves.isWarning ? "" : undefined}>
					<Icon name={moves.isWarning ? "x" : "check"} size={14} />
					{moves.toast}
				</span>
			)}
			<span className="wg-cm-gap" />
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
