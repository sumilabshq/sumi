export interface DropLine {
	readonly y: number;
	readonly left: number;
	readonly right: number;
	readonly glyphX: number;
}

const NEIGHBOUR_REACH_PX = 16;
const LONE_EDGE_PX = 3;
const LINE_HALF_PX = 3;
const ROW = ".sumi-flows-row";
const FOLDER = ".sumi-flows-folder";
const SECTION = ".sumi-flows-section";
const GLYPH = ".sumi-flows-row .sumi-flows-glyph";
const ROOT = ".sumi-flows";

export function dropLineOf(element: Element, isUpper: boolean): DropLine {
	const box = element.getBoundingClientRect();
	const root = element.closest(ROOT) ?? element.ownerDocument.body;
	const glyph = element.matches(ROW) ? element.querySelector(".sumi-flows-glyph") : element.querySelector(GLYPH);
	const glyphBox = (glyph ?? root.querySelector(GLYPH))?.getBoundingClientRect();
	const section = element.matches(SECTION) ? null : element.closest(SECTION);
	const bounds = section?.getBoundingClientRect() ?? box;
	const left = Math.max(box.left, bounds.left);
	const right = Math.min(box.right, bounds.right);
	const glyphX = glyphBox === undefined ? left : glyphBox.left + glyphBox.width / 2;
	return {
		y: clampedY(gapYOf(element, root, isUpper), section === null ? null : bounds),
		left,
		right,
		glyphX: Math.min(Math.max(glyphX, left), right),
	};
}

function clampedY(y: number, bounds: DOMRect | null): number {
	return bounds === null ? y : Math.min(Math.max(y, bounds.top + LINE_HALF_PX), bounds.bottom - LINE_HALF_PX);
}

function neighbourOf(element: Element, root: Element, isUpper: boolean): Element | undefined {
	if (element.matches(FOLDER)) {
		return (isUpper ? element.previousElementSibling : element.nextElementSibling) ?? undefined;
	}

	const siblings = [...root.querySelectorAll(element.matches(ROW) ? ROW : SECTION)];
	return siblings[siblings.indexOf(element) + (isUpper ? -1 : 1)];
}

function gapYOf(element: Element, root: Element, isUpper: boolean): number {
	const box = element.getBoundingClientRect();
	const neighbour = neighbourOf(element, root, isUpper)?.getBoundingClientRect();
	const edge = isUpper ? box.top : box.bottom;

	if (neighbour === undefined) {
		return isUpper ? edge - LONE_EDGE_PX : edge + LONE_EDGE_PX;
	}

	const otherEdge = isUpper ? neighbour.bottom : neighbour.top;
	return Math.abs(edge - otherEdge) > NEIGHBOUR_REACH_PX
		? edge + (isUpper ? -LONE_EDGE_PX : LONE_EDGE_PX)
		: (edge + otherEdge) / 2;
}
