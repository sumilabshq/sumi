import { ICON_TABLE, ICON_VIEW_BOX } from "@widgetarium/kit/icons";

export type GlyphName = "check" | "chevron-down" | "copy" | "move-horizontal" | "play" | "text-wrap";

const SVG_SPACE = "http://www.w3.org/2000/svg";

const STROKE_LOOK: Readonly<Record<string, string>> = {
	viewBox: ICON_VIEW_BOX,
	fill: "none",
	stroke: "currentColor",
	"stroke-width": "2",
	"stroke-linecap": "round",
	"stroke-linejoin": "round",
	"aria-hidden": "true",
};

export function createGlyph(page: Document, name: GlyphName): SVGSVGElement {
	const glyph = page.createElementNS(SVG_SPACE, "svg");

	for (const [attribute, value] of Object.entries(STROKE_LOOK)) {
		glyph.setAttribute(attribute, value);
	}

	glyph.innerHTML = ICON_TABLE[name];
	return glyph;
}
