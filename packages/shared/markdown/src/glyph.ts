import { SHARP_TABLE, SHARP_VIEW_BOX } from "@widgetarium/kit/sharp-icons";

export type GlyphName = "check" | "chevron-down" | "copy" | "move-horizontal" | "play" | "text-wrap";

const SVG_SPACE = "http://www.w3.org/2000/svg";

const FILLED_LOOK: Readonly<Record<string, string>> = {
	viewBox: SHARP_VIEW_BOX,
	fill: "currentColor",
	"aria-hidden": "true",
};

export function createGlyph(page: Document, name: GlyphName): SVGSVGElement {
	const glyph = page.createElementNS(SVG_SPACE, "svg");

	for (const [attribute, value] of Object.entries(FILLED_LOOK)) {
		glyph.setAttribute(attribute, value);
	}

	glyph.innerHTML = SHARP_TABLE[name] ?? "";
	return glyph;
}
