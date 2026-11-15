import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { MenuMoves } from "../../lib/use-menu-moves.js";

export interface MenuToastProps {
	readonly moves: MenuMoves;
}

export function MenuToast({ moves }: MenuToastProps): ReactElement {
	return (
		<span className="wg-cm-toast" role="status" data-warning={moves.isWarning ? "" : undefined}>
			{moves.toast}
		</span>
	);
}
