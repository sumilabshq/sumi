import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Row } from "@sumi/command-menu";
import type { MenuMoves } from "../../lib/use-menu-moves.js";

export interface RowActionsProps {
	readonly row: Row;
	readonly moves: MenuMoves;
}

const ACTIONS = "Actions";

export function RowActions({ row, moves }: RowActionsProps): ReactElement {
	return (
		<div className="wg-cm-actions" role="menu" aria-label={ACTIONS}>
			<div className="wg-cm-actions-head">{row.title}</div>
			{row.actions.map((action) => (
				<button
					key={action.label}
					type="button"
					role="menuitem"
					className="wg-cm-action"
					data-danger={action.isDanger ? "" : undefined}
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => {
						if (action.isRename) {
							moves.rename.start();
							return;
						}

						if (action.intent !== null) {
							moves.run(action.intent);
						}
					}}
				>
					<span className="wg-cm-action-said">{action.label}</span>
					{action.shortcut === null ? null : <kbd className="wg-cm-kbd">{action.shortcut}</kbd>}
				</button>
			))}
		</div>
	);
}
