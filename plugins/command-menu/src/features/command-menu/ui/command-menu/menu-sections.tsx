import { createElement as h, Fragment, useRef } from "react";
import type { ReactElement } from "react";
import type { Section } from "@sumi/command-menu";
import { useBox } from "@widgetarium/core/use-width.js";
import type { MenuMoves } from "../../lib/use-menu-moves.js";
import { MenuRow } from "./menu-row.js";
import { MenuTile } from "./menu-tile.js";
import { RenameRow } from "./rename-row.js";

export interface MenuSectionsProps {
	readonly sections: readonly Section[];
	readonly isNothingFound: boolean;
	readonly moves: MenuMoves;
}

const RESULTS = "Results";
const NOTHING_FOUND = "Nothing found";

export function MenuSections({ sections, isNothingFound, moves }: MenuSectionsProps): ReactElement {
	const list = useRef<HTMLDivElement>(null);
	const { height } = useBox(list);
	const firstAt = sections.map((_section, index) =>
		sections.slice(0, index).reduce((sum, one) => sum + one.rows.length, 0),
	);
	return (
		<div className="wg-cm-list-frame" style={height === 0 ? undefined : { height }}>
			<div ref={list} className="wg-cm-list" role="listbox" aria-label={RESULTS}>
				{isNothingFound ? <div className="wg-cm-nothing">{NOTHING_FOUND}</div> : null}
				{sections.map((section, index) => (
					<Fragment key={`${section.label}:${index}`}>
						{section.label === "" ? null : <div className="wg-cm-label">{section.label}</div>}
						{section.layout === "grid" ? (
							<div className="wg-cm-grid">
								{section.rows.map((row, at) => (
									<MenuTile key={row.key} row={row} at={(firstAt[index] ?? 0) + at} moves={moves} />
								))}
							</div>
						) : (
							section.rows.map((row, at) =>
								moves.rename.key === row.key ? (
									<RenameRow key={row.key} row={row} moves={moves} />
								) : (
									<MenuRow key={row.key} row={row} at={(firstAt[index] ?? 0) + at} moves={moves} />
								),
							)
						)}
					</Fragment>
				))}
			</div>
		</div>
	);
}
