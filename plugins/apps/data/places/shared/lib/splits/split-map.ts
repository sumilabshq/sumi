import type { SplitCell, SplitMap, SplitNode } from "../../schema/splits.schema.js";

interface UnitBox {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

const WHOLE: UnitBox = {
	x: 0,
	y: 0,
	w: 1,
	h: 1,
};

export function splitMapOf(layout: SplitNode, markedId: string): SplitMap {
	return {
		cells: cellsIn(layout, WHOLE),
		markedId,
	};
}

function cellsIn(node: SplitNode, box: UnitBox): readonly SplitCell[] {
	if (node.kind === "tab") {
		return [{ tabId: node.tabId, ...box }];
	}

	const total = node.shares.reduce((sum, share) => sum + share, 0);
	const starts = node.shares.map((_share, at) => node.shares.slice(0, at).reduce((sum, one) => sum + one, 0) / total);
	return node.children.flatMap((child, at) => {
		const start = starts[at] ?? 0;
		const part = (node.shares[at] ?? 0) / total;
		return cellsIn(child, node.dir === "row" ? rowPartOf(box, start, part) : columnPartOf(box, start, part));
	});
}

function rowPartOf(box: UnitBox, start: number, part: number): UnitBox {
	return {
		...box,
		x: box.x + box.w * start,
		w: box.w * part,
	};
}

function columnPartOf(box: UnitBox, start: number, part: number): UnitBox {
	return {
		...box,
		y: box.y + box.h * start,
		h: box.h * part,
	};
}
