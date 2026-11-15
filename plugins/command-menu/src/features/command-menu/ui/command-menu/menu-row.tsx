import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Row } from "@sumi/command-menu/contract";
import type { MenuMoves } from "../../lib/use-menu-moves.js";
import { useScrollsIntoViewWhen } from "../../lib/use-scrolls-into-view-when.js";
import { RowEnd } from "./row-end.js";
import { RowIcon } from "./row-icon.js";
import { RowTitle } from "./row-title.js";

export interface MenuRowProps {
	readonly row: Row;
	readonly at: number;
	readonly moves: MenuMoves;
}

export function MenuRow({ row, at, moves }: MenuRowProps): ReactElement {
	const isPicked = at === moves.pickedAt;
	const button = useScrollsIntoViewWhen(isPicked);
	return (
		<button
			ref={button}
			type="button"
			role="option"
			className="wg-cm-row"
			aria-selected={isPicked}
			data-cm-row={row.kind}
			data-cm-fallback={row.isFallback ? "" : undefined}
			onMouseDown={(event) => event.preventDefault()}
			onMouseMove={() => !isPicked && moves.pickAt(at)}
			onClick={() => moves.run(row.intent)}
		>
			<RowIcon icon={row.icon} />
			<RowTitle title={row.title} match={row.match} />
			{row.place === null ? null : <span className="wg-cm-place">{row.place}</span>}
			<RowEnd shortcut={row.shortcut} isPicked={isPicked} />
		</button>
	);
}
