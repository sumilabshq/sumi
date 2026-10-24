import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Row } from "@widgetarium/command-menu";
import type { MenuMoves } from "../../lib/use-menu-moves.js";
import { useSelectsFieldOnMount } from "../../lib/use-selects-field-on-mount.js";
import { RowIcon } from "./row-icon.js";

export interface RenameRowProps {
	readonly row: Row;
	readonly moves: MenuMoves;
}

const NEW_NAME = "New name";
const SAVE = "Save";
const ENTER = "↵";

export function RenameRow({ row, moves }: RenameRowProps): ReactElement {
	const field = useSelectsFieldOnMount();
	return (
		<div className="wg-cm-row" role="option" aria-selected="true" data-cm-renaming="">
			<RowIcon icon={row.icon} />
			<input
				ref={field}
				className="wg-cm-rename"
				value={moves.rename.name}
				aria-label={NEW_NAME}
				spellCheck={false}
				onChange={(event) => moves.rename.type(event.currentTarget.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						moves.rename.save();
					}

					if (event.key === "Escape") {
						event.preventDefault();
						event.stopPropagation();
						moves.rename.stop();
					}
				}}
				onBlur={() => moves.rename.stop()}
			/>
			<span className="wg-cm-end">
				<span>{SAVE}</span>
				<kbd className="wg-cm-kbd">{ENTER}</kbd>
			</span>
		</div>
	);
}
