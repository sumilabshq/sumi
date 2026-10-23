import type { PaneNode, PaneSide } from "../schema/pane-tree.schema.js";

export interface PaneRect {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

export interface PaneLayoutAsk {
	readonly gap: number;
	readonly chatPx: number;
}

const EDGE_SHARE = 0.25;
const PLATE_LEAST_PX = 320;

export function paneRectsOf(node: PaneNode | null, box: PaneRect, ask: PaneLayoutAsk): ReadonlyMap<string, PaneRect> {
	const rects = new Map<string, PaneRect>();

	if (node !== null) {
		layInto(rects, node, box, ask);
	}

	return rects;
}

export function sideAt(rect: PaneRect, x: number, y: number): PaneSide {
	const across = (x - rect.left) / rect.width;
	const down = (y - rect.top) / rect.height;
	const edges: readonly (readonly [PaneSide, number])[] = [
		["left", across],
		["right", 1 - across],
		["top", down],
		["bottom", 1 - down],
	];
	const nearest = [...edges].sort((one, other) => one[1] - other[1])[0];
	return nearest !== undefined && nearest[1] < EDGE_SHARE ? nearest[0] : "center";
}

function layInto(rects: Map<string, PaneRect>, node: PaneNode, box: PaneRect, ask: PaneLayoutAsk): void {
	if (node.kind === "pane") {
		rects.set(node.id, box);
		return;
	}

	const isRow = node.dir === "row";
	const span = (isRow ? box.width : box.height) - ask.gap * (node.children.length - 1);
	const sizes = sizesOf(node, span, ask);
	let offset = 0;
	node.children.forEach((child, at) => {
		const size = sizes[at] ?? 0;
		layInto(rects, child, isRow ? along(box, offset, size) : down(box, offset, size), ask);
		offset += size + ask.gap;
	});
}

function sizesOf(node: Extract<PaneNode, { kind: "split" }>, span: number, ask: PaneLayoutAsk): readonly number[] {
	const count = node.children.length;
	const chatAt = node.dir === "row" ? node.children.findIndex(isChatLeaf) : -1;

	if (chatAt === -1) {
		return node.children.map(() => span / count);
	}

	const chatSize = Math.max(PLATE_LEAST_PX, Math.min(ask.chatPx, span - PLATE_LEAST_PX * (count - 1)));
	const shared = (span - chatSize) / (count - 1);
	return node.children.map((_child, at) => (at === chatAt ? chatSize : shared));
}

function isChatLeaf(node: PaneNode): boolean {
	return node.kind === "pane" && node.view.kind === "chat";
}

function along(box: PaneRect, offset: number, size: number): PaneRect {
	return {
		left: box.left + offset,
		top: box.top,
		width: size,
		height: box.height,
	};
}

function down(box: PaneRect, offset: number, size: number): PaneRect {
	return {
		left: box.left,
		top: box.top + offset,
		width: box.width,
		height: size,
	};
}
