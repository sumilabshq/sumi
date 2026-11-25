export interface DropLine {
	readonly y: number;
	readonly left: number;
	readonly right: number;
	readonly glyphX: number;
}

const NEIGHBOUR_REACH_PX = 16;
const LONE_EDGE_PX = 3;
const ROW = ".sumi-flows-row";
const SECTION = ".sumi-flows-section";
const GLYPH = ".sumi-flows-row .sumi-flows-glyph";
const ROOT = ".sumi-flows";

export function dropLineOf(element: Element, isUpper: boolean): DropLine {
	const box = element.getBoundingClientRect();
	const root = element.closest(ROOT) ?? element.ownerDocument.body;
	const glyph = element.matches(ROW) ? element.querySelector(".sumi-flows-glyph") : element.querySelector(GLYPH);
	const glyphBox = (glyph ?? root.querySelector(GLYPH))?.getBoundingClientRect();
	return {
		y: gapYOf(element, root, isUpper),
		left: box.left,
		right: box.right,
		glyphX: glyphBox === undefined ? box.left : glyphBox.left + glyphBox.width / 2,
	};
}

function gapYOf(element: Element, root: Element, isUpper: boolean): number {
	const box = element.getBoundingClientRect();
	const siblings = [...root.querySelectorAll(element.matches(ROW) ? ROW : SECTION)];
	const at = siblings.indexOf(element);
	const neighbour = siblings[isUpper ? at - 1 : at + 1]?.getBoundingClientRect();
	const edge = isUpper ? box.top : box.bottom;

	if (neighbour === undefined) {
		return isUpper ? edge - LONE_EDGE_PX : edge + LONE_EDGE_PX;
	}

	const otherEdge = isUpper ? neighbour.bottom : neighbour.top;
	return Math.abs(edge - otherEdge) > NEIGHBOUR_REACH_PX
		? edge + (isUpper ? -LONE_EDGE_PX : LONE_EDGE_PX)
		: (edge + otherEdge) / 2;
}
