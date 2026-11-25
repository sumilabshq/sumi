import type { FlowNode, FlowPane } from "@widgetarium/navigation/contract";

export interface Frame {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

export interface PaneRect extends Frame {
	readonly paneId: string;
}

export interface SplitEdge {
	readonly splitId: string;
	readonly at: number;
	readonly dir: "row" | "column";
	readonly frame: Frame;
	readonly shares: readonly number[];
}

const WHOLE_BOARD: Frame = {
	left: 0,
	top: 0,
	width: 1,
	height: 1,
};

const TOP_EDGE_TOLERANCE = 1e-6;

export function paneRectsOf(root: FlowNode): readonly PaneRect[] {
	return rectsWithin(root, WHOLE_BOARD);
}

export function panesOf(node: FlowNode): readonly FlowPane[] {
	return node.kind === "pane" ? [node] : node.children.flatMap(panesOf);
}

export function edgesOf(root: FlowNode): readonly SplitEdge[] {
	return edgesWithin(root, WHOLE_BOARD);
}

export function isAtTopEdge(rect: Frame): boolean {
	return rect.top < TOP_EDGE_TOLERANCE;
}

export function childFramesOf(split: Extract<FlowNode, { kind: "split" }>, frame: Frame): readonly Frame[] {
	const total = split.shares.reduce((sum, share) => sum + share, 0);
	return split.children.map((_, at) => {
		const before = split.shares.slice(0, at).reduce((sum, share) => sum + share, 0);
		return frameOfSlice(split.dir, frame, {
			start: before / total,
			size: (split.shares[at] ?? 0) / total,
		});
	});
}

function rectsWithin(node: FlowNode, frame: Frame): readonly PaneRect[] {
	if (node.kind === "pane") {
		return [{ paneId: node.id, ...frame }];
	}

	const frames = childFramesOf(node, frame);
	return node.children.flatMap((child, at) => rectsWithin(child, frames[at] ?? frame));
}

function edgesWithin(node: FlowNode, frame: Frame): readonly SplitEdge[] {
	if (node.kind === "pane") {
		return [];
	}

	const frames = childFramesOf(node, frame);
	const own = node.children.slice(1).map((_, boundary) => ({
		splitId: node.id,
		at: boundary,
		dir: node.dir,
		frame,
		shares: node.shares,
	}));
	return [...own, ...node.children.flatMap((child, at) => edgesWithin(child, frames[at] ?? frame))];
}

interface Slice {
	readonly start: number;
	readonly size: number;
}

function frameOfSlice(dir: "row" | "column", frame: Frame, slice: Slice): Frame {
	if (dir === "row") {
		return {
			...frame,
			left: frame.left + frame.width * slice.start,
			width: frame.width * slice.size,
		};
	}

	return {
		...frame,
		top: frame.top + frame.height * slice.start,
		height: frame.height * slice.size,
	};
}
