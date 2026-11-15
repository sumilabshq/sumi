import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { MenuMoves } from "../../lib/use-menu-moves.js";
import { MenuToast } from "../command-menu/menu-toast.js";

export interface HomeFootProps {
	readonly moves: MenuMoves;
}

const HOME_HINTS: readonly string[] = ["Tab completes", "↑↓ moves", "↵ opens here", "⌘↵ new tab", "⇧⌘↵ new window"];

export function HomeFoot({ moves }: HomeFootProps): ReactElement {
	return (
		<div className="wg-cm-foot">
			{moves.toast === ""
				? HOME_HINTS.map((hint) => (
						<span key={hint} className="wg-cm-hint">
							{hint}
						</span>
					))
				: <MenuToast moves={moves} />}
		</div>
	);
}
