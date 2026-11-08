import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { PopoverItem } from "@widgetarium/kit";
import type { GlyphName } from "../../lib/glyph-paths.js";
import { Glyph } from "../glyph/glyph.js";

export interface MenuRowProps {
	readonly glyph: GlyphName;
	readonly isChosen: boolean;
	readonly label: string;
	readonly hint?: ReactNode;
	onPick(): void;
}

export function MenuRow({ glyph, isChosen, label, hint, onPick }: MenuRowProps): ReactElement {
	return (
		<PopoverItem aria-current={isChosen ? "true" : undefined} onClick={onPick}>
			<Glyph name={isChosen ? "tick" : glyph} />
			<span className="wg-git-mi-label">{label}</span>
			{hint === undefined ? null : <span className="wg-git-mi-hint">{hint}</span>}
		</PopoverItem>
	);
}
