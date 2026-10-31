import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export type FieldGlyph = "find" | "new" | "ask";

export interface FieldIconProps {
	readonly shown: FieldGlyph;
}

const FIELD_ICON_PX = 20;
const FIELD_GLYPHS: readonly FieldGlyph[] = ["find", "new", "ask"];
const ICON_OF_GLYPH: Readonly<Record<Exclude<FieldGlyph, "ask">, string>> = {
	find: "search",
	new: "plus",
};

export function FieldIcon({ shown }: FieldIconProps): ReactElement {
	return (
		<span className="wg-cm-field-icon" data-cm-field-icon={shown}>
			{FIELD_GLYPHS.map((glyph) => (
				<span key={glyph} className="wg-cm-field-glyph" data-shown={glyph === shown ? "" : undefined}>
					{glyph === "ask" ? <span className="wg-cm-ink" /> : <Icon name={ICON_OF_GLYPH[glyph]} size={FIELD_ICON_PX} />}
				</span>
			))}
		</span>
	);
}
