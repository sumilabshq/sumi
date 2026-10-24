import type { PaneNode, PaneSide, PaneSplit, SplitDir } from "@widgetarium/layout";

export interface PaneRect {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

export interface PaneEdge {
	readonly splitId: string;
	readonly at: number;
	readonly dir: SplitDir;
	readonly rect: PaneRect;
	readonly startPx: number;
	readonly spanPx: number;
	readonly pairShare: number;
	readonly isChatEdge: boolean;
}

export interface PaneLayout {
	readonly rects: ReadonlyMap<string, PaneRect>;
	readonly edges: readonly PaneEdge[];
}

export interface PaneSpacing {
	readonly gapPx: number;
	readonly leastPx: number;
}

export interface DraggedShare {
	readonly splitId: string;
	readonly at: number;
	readonly share: number;
}

export interface LayoutAsk {
	readonly node: PaneNode | null;
	readonly box: PaneRect;
	readonly spacing: PaneSpacing;
	readonly dragged: DraggedShare | null;
}

export interface DraggedLayoutAsk extends LayoutAsk {
	readonly dragged: DraggedShare;
}

export function paneLayoutOf(node: PaneNode | null, box: PaneRect, spacing: PaneSpacing): PaneLayout {
	return laidOut({
		node,
		box,
		spacing,
		dragged: null,
	});
}

export function draggedLayoutOf(ask: DraggedLayoutAsk): PaneLayout {
	return laidOut(ask);
}

export interface PanePlace {
	readonly left: string;
	readonly top: string;
	readonly width: string;
	readonly height: string;
}

const PROBE_PX = 1;

export function panePlacesOf(ask: LayoutAsk): ReadonlyMap<string, PanePlace> {
	const here = laidOut(ask).rects;
	const grown = laidOut({
		...ask,
		box: {
			...ask.box,
			width: ask.box.width + PROBE_PX,
			height: ask.box.height + PROBE_PX,
		},
	}).rects;
	return new Map(Array.from(here, ([id, rect]) => [id, placeOf(rect, grown.get(id) ?? rect, ask.box)]));
}

export function fixedPlaceOf(rect: PaneRect): PanePlace {
	return {
		left: `${rect.left}px`,
		top: `${rect.top}px`,
		width: `${rect.width}px`,
		height: `${rect.height}px`,
	};
}

export function sideAt(rect: PaneRect, x: number, y: number): PaneSide {
	const across = (x - rect.left) / rect.width;
	const down = (y - rect.top) / rect.height;
	const edges: (readonly [PaneSide, number])[] = [
		["left", across],
		["right", 1 - across],
		["top", down],
		["bottom", 1 - down],
	];
	return edges.sort((one, other) => one[1] - other[1])[0]?.[0] ?? "right";
}

function placeOf(rect: PaneRect, grown: PaneRect, box: PaneRect): PanePlace {
	return {
		left: lengthOf(rect.left, grown.left, box.width),
		top: lengthOf(rect.top, grown.top, box.height),
		width: lengthOf(rect.width, grown.width, box.width),
		height: lengthOf(rect.height, grown.height, box.height),
	};
}

function lengthOf(px: number, grownPx: number, boxPx: number): string {
	const share = (grownPx - px) / PROBE_PX;
	const fixedPx = px - share * boxPx;
	return `calc(${roundedTo(share * 100, 4)}% + ${roundedTo(fixedPx, 2)}px)`;
}

function roundedTo(value: number, digits: number): number {
	const scale = 10 ** digits;
	return Math.round(value * scale) / scale;
}

interface Laying {
	readonly rects: Map<string, PaneRect>;
	readonly edges: PaneEdge[];
	readonly spacing: PaneSpacing;
	readonly dragged: DraggedShare | null;
}

function laidOut({ node, box, spacing, dragged }: LayoutAsk): PaneLayout {
	const rects = new Map<string, PaneRect>();
	const edges: PaneEdge[] = [];

	if (node !== null) {
		layInto({ rects, edges, spacing, dragged }, node, box);
	}

	return {
		rects,
		edges,
	};
}

function layInto(laying: Laying, node: PaneNode, box: PaneRect): void {
	if (node.kind === "pane") {
		laying.rects.set(node.id, box);
		return;
	}

	const isRow = node.dir === "row";
	const origin = isRow ? box.left : box.top;
	const { gapPx, leastPx } = laying.spacing;
	const span = (isRow ? box.width : box.height) - gapPx * (node.children.length - 1);
	const split = withDraggedShare(node, laying.dragged);
	const sizes = sizesOf(split, span, leastPx);
	let offset = 0;
	node.children.forEach((child, at) => {
		const size = sizes[at] ?? 0;
		layInto(laying, child, isRow ? sliceAcross(box, offset, size) : sliceDown(box, offset, size));

		if (at < node.children.length - 1) {
			laying.edges.push(edgeOf(split, at, sliceEdge(box, isRow, offset + size + gapPx / 2), origin + offset, span));
		}

		offset += size + gapPx;
	});
}

function withDraggedShare(split: PaneSplit, dragged: DraggedShare | null): PaneSplit {
	if (dragged === null || dragged.splitId !== split.id) {
		return split;
	}

	const pair = (split.shares[dragged.at] ?? 0) + (split.shares[dragged.at + 1] ?? 0);
	const share = Math.min(Math.max(dragged.share, 0), pair);
	return {
		...split,
		shares: split.shares.map((kept, at) => draggedShareAt(at, { ...dragged, share }, pair) ?? kept),
	};
}

function draggedShareAt(at: number, dragged: DraggedShare, pair: number): number | null {
	if (at === dragged.at) {
		return dragged.share;
	}

	return at === dragged.at + 1 ? pair - dragged.share : null;
}

function sizesOf(node: PaneSplit, span: number, leastPx: number): readonly number[] {
	const wanted = node.children.map((_child, at) => (node.shares[at] ?? 1 / node.children.length) * span);
	const least = Math.min(leastPx, span / node.children.length);
	const lacking = wanted.reduce((sum, px) => sum + Math.max(0, least - px), 0);
	const roomy = wanted.reduce((sum, px) => sum + (px > least ? px - least : 0), 0);
	return wanted.map((px) => (px <= least ? least : px - (lacking * (px - least)) / Math.max(roomy, 1)));
}

function edgeOf(node: PaneSplit, at: number, rect: PaneRect, startPx: number, spanPx: number): PaneEdge {
	return {
		splitId: node.id,
		at,
		dir: node.dir,
		rect,
		startPx,
		spanPx,
		pairShare: (node.shares[at] ?? 0) + (node.shares[at + 1] ?? 0),
		isChatEdge: node.dir === "row" && isChatLeaf(node.children[at]),
	};
}

function sliceAcross(box: PaneRect, offset: number, size: number): PaneRect {
	return {
		left: box.left + offset,
		top: box.top,
		width: size,
		height: box.height,
	};
}

function sliceDown(box: PaneRect, offset: number, size: number): PaneRect {
	return {
		left: box.left,
		top: box.top + offset,
		width: box.width,
		height: size,
	};
}

function sliceEdge(box: PaneRect, isRow: boolean, at: number): PaneRect {
	return isRow ? sliceAcross(box, at, 0) : sliceDown(box, at, 0);
}

function isChatLeaf(node: PaneNode | undefined): boolean {
	return node?.kind === "pane" && node.view.kind === "chat";
}
