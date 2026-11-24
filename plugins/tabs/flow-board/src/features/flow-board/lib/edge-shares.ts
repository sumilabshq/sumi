import type { CSSProperties } from "react";
import type { FlowNode } from "@widgetarium/navigation/contract";
import type { SplitEdge } from "@sumi/flow-strip-plugin";

export interface EdgeDraft {
	readonly splitId: string;
	readonly shares: readonly number[];
}

const MIN_SHARE_OF_TOTAL = 0.1;

export function rootWithDraft(root: FlowNode, draft: EdgeDraft | null): FlowNode {
	if (draft === null || root.kind === "pane") {
		return root;
	}

	return {
		...root,
		shares: root.id === draft.splitId ? draft.shares : root.shares,
		children: root.children.map((child) => rootWithDraft(child, draft)),
	};
}

export function boundaryOf(edge: SplitEdge): number {
	const total = sumOf(edge.shares);
	return sumOf(edge.shares.slice(0, edge.at + 1)) / total;
}

export function edgePlaceOf(edge: SplitEdge): CSSProperties {
	const { frame } = edge;
	const boundary = boundaryOf(edge);

	if (edge.dir === "row") {
		return {
			left: `${(frame.left + frame.width * boundary) * 100}%`,
			top: `${frame.top * 100}%`,
			height: `${frame.height * 100}%`,
		};
	}

	return {
		left: `${frame.left * 100}%`,
		top: `${(frame.top + frame.height * boundary) * 100}%`,
		width: `${frame.width * 100}%`,
	};
}

export function sharesAfterDrag(edge: SplitEdge, fraction: number): readonly number[] {
	const total = sumOf(edge.shares);
	const before = sumOf(edge.shares.slice(0, edge.at));
	const combined = (edge.shares[edge.at] ?? 0) + (edge.shares[edge.at + 1] ?? 0);
	const least = total * MIN_SHARE_OF_TOTAL;
	const wanted = fraction * total - before;
	const share = Math.min(Math.max(wanted, least), combined - least);
	return edge.shares.map((held, at) => {
		if (at === edge.at) {
			return share;
		}

		return at === edge.at + 1 ? combined - share : held;
	});
}

function sumOf(shares: readonly number[]): number {
	return shares.reduce((sum, share) => sum + share, 0);
}
