import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { FlowIcon } from "@widgetarium/navigation/contract";

const GLYPH_PX = 13;

export interface FlowGlyphProps {
	readonly icon: FlowIcon | null;
	readonly fallback: "folder" | "dot";
}

export function FlowGlyph({ icon, fallback }: FlowGlyphProps): ReactElement {
	return <span className="sumi-flows-glyph">{glyphOf(icon, fallback)}</span>;
}

function glyphOf(icon: FlowIcon | null, fallback: FlowGlyphProps["fallback"]): ReactElement {
	if (icon === null) {
		return fallback === "folder" ? <Icon name="folder" size={GLYPH_PX} /> : <i className="sumi-flows-dot" />;
	}

	return icon.kind === "icon" ? <Icon name={icon.name} size={GLYPH_PX} /> : <span>{icon.emoji}</span>;
}
