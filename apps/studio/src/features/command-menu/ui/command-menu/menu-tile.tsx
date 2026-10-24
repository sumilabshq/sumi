import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Row } from "@widgetarium/command-menu";
import type { MenuMoves } from "../../lib/use-menu-moves.js";
import { RowIcon } from "./row-icon.js";

export interface MenuTileProps {
	readonly row: Row;
	readonly at: number;
	readonly moves: MenuMoves;
}

export function MenuTile({ row, at, moves }: MenuTileProps): ReactElement {
	const isPicked = at === moves.pickedAt;
	return (
		<button
			type="button"
			role="option"
			className="wg-cm-tile"
			aria-selected={isPicked}
			data-cm-tile={row.kind}
			onMouseDown={(event) => event.preventDefault()}
			onMouseMove={() => !isPicked && moves.pickAt(at)}
			onClick={() => moves.run(row.intent)}
		>
			<span className="wg-cm-tile-icon">
				<RowIcon icon={row.icon} />
			</span>
			<span className="wg-cm-tile-title">{row.title}</span>
		</button>
	);
}
