export type SplitSide = "left" | "right" | "top" | "bottom";

export interface Box {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

export type DragAim =
	| {
			readonly kind: "strip";
			readonly index: number;
			readonly line: Box;
	  }
	| {
			readonly kind: "split";
			readonly side: SplitSide;
			readonly zone: Box;
	  }
	| { readonly kind: "away" }
	| { readonly kind: "none" };

export interface AimFacts {
	readonly x: number;
	readonly y: number;
	readonly strip: Box;
	readonly tabs: readonly Box[];
	readonly page: Box;
	readonly view: Box;
}

export const SPLIT_LABELS: Readonly<Record<SplitSide, string>> = {
	left: "Split left",
	right: "Split right",
	top: "Split top",
	bottom: "Split bottom",
};

const EDGE_BAND = 0.2;
const STRIP_SLACK_PX = 60;
const HALF = 0.5;
const GAP_MIDDLE_PX = 1;

export function aimOf(facts: AimFacts): DragAim {
	if (!isInside(facts.view, facts.x, facts.y)) {
		return { kind: "away" };
	}

	if (facts.y < facts.page.top + STRIP_SLACK_PX) {
		return stripAimOf(facts);
	}

	return splitAimOf(facts);
}

function stripAimOf({ x, strip, tabs }: AimFacts): DragAim {
	const index = tabs.filter((tab) => tab.left + tab.width * HALF < x).length;
	return {
		kind: "strip",
		index,
		line: {
			left: lineXOf(tabs, index, strip),
			top: strip.top,
			width: 1,
			height: strip.height,
		},
	};
}

function lineXOf(tabs: readonly Box[], index: number, strip: Box): number {
	const next = tabs[index];

	if (next !== undefined) {
		return next.left - GAP_MIDDLE_PX;
	}

	const last = tabs.at(-1);
	return last === undefined ? strip.left : last.left + last.width + GAP_MIDDLE_PX;
}

function splitAimOf({ x, y, page }: AimFacts): DragAim {
	const side = sideOf((x - page.left) / page.width, (y - page.top) / page.height);
	return {
		kind: "split",
		side,
		zone: halfOf(page, side),
	};
}

function sideOf(across: number, down: number): SplitSide {
	if (down < EDGE_BAND) {
		return "top";
	}

	if (down > 1 - EDGE_BAND) {
		return "bottom";
	}

	return across < HALF ? "left" : "right";
}

function halfOf(page: Box, side: SplitSide): Box {
	const halfWidth = page.width * HALF;
	const halfHeight = page.height * HALF;
	const boxes: Readonly<Record<SplitSide, Box>> = {
		left: {
			...page,
			width: halfWidth,
		},
		right: {
			...page,
			left: page.left + halfWidth,
			width: halfWidth,
		},
		top: {
			...page,
			height: halfHeight,
		},
		bottom: {
			...page,
			top: page.top + halfHeight,
			height: halfHeight,
		},
	};
	return boxes[side];
}

function isInside(box: Box, x: number, y: number): boolean {
	return x >= box.left && y >= box.top && x < box.left + box.width && y < box.top + box.height;
}
