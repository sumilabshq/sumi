import { iconOf } from "./glyphs";

export { iconOf } from "./glyphs";
export type { IconDrawing } from "./glyphs";

const SVG_SPACE = "http://www.w3.org/2000/svg";
const ICON_PX = 16;
// TRADE-OFF: repeats --wg-kit-icon-stroke, for pages the kit sheet never reaches
const STROKE_WIDTH = "2";

function lookOf(viewBox: string, size: number): Readonly<Record<string, string>> {
	return {
		class: "wg-kit-icon-glyph is-lucide",
		viewBox,
		width: String(size),
		height: String(size),
		fill: "none",
		stroke: "currentColor",
		"stroke-width": STROKE_WIDTH,
		"stroke-linecap": "round",
		"stroke-linejoin": "round",
		"aria-hidden": "true",
	};
}

export function iconSvgOf(name: string, size = ICON_PX): string | null {
	const drawn = iconOf(name);
	if (drawn === null) return null;
	const attributes = Object.entries(lookOf(drawn.viewBox, size))
		.map(([attribute, value]) => `${attribute}="${value}"`)
		.join(" ");
	return `<svg xmlns="${SVG_SPACE}" ${attributes}>${drawn.body}</svg>`;
}

export function createIcon(page: Document, name: string, size = ICON_PX): SVGSVGElement {
	const icon = page.createElementNS(SVG_SPACE, "svg");
	const drawn = iconOf(name);

	for (const [attribute, value] of Object.entries(lookOf(drawn?.viewBox ?? "", size))) {
		icon.setAttribute(attribute, value);
	}

	icon.innerHTML = drawn?.body ?? "";
	return icon;
}
