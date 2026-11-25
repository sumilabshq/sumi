import type { SplitSide } from "@widgetarium/navigation/contract";
import type { Point } from "../../../shared/lib/track-pointer.js";
import { PANE_BODY_ATTRIBUTE, PANE_ROW_ATTRIBUTE, TAB_ATTRIBUTE } from "../../../shared/lib/pane-dom.js";

export interface Box {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

export interface RowScene {
	readonly paneId: string;
	readonly box: Box;
	readonly tabs: readonly { readonly id: string; readonly box: Box }[];
}

export interface BodyScene {
	readonly paneId: string;
	readonly box: Box;
}

export interface Scene {
	readonly rows: readonly RowScene[];
	readonly bodies: readonly BodyScene[];
}

export type DragAim =
	| { readonly kind: "insert"; readonly paneId: string; readonly before: string | null; readonly mark: Box }
	| { readonly kind: "append"; readonly paneId: string; readonly zone: Box }
	| { readonly kind: "split"; readonly paneId: string; readonly side: SplitSide; readonly zone: Box };

const EDGE_SHARE = 0.25;
const MARK_PX = 2;

export function aimAt(point: Point, scene: Scene, draggedId: string): DragAim | null {
	const row = scene.rows.find((candidate) => isInside(point, candidate.box));

	if (row !== undefined) {
		return insertAimOf(point, row, draggedId);
	}

	const body = scene.bodies.find((candidate) => isInside(point, candidate.box));
	return body === undefined ? null : bodyAimOf(point, body);
}

export function sceneOf(root: ParentNode): Scene {
	return {
		rows: [...root.querySelectorAll(`[${PANE_ROW_ATTRIBUTE}]`)].map(rowSceneOf),
		bodies: [...root.querySelectorAll(`[${PANE_BODY_ATTRIBUTE}]`)].map((element) => ({
			paneId: element.getAttribute(PANE_BODY_ATTRIBUTE) ?? "",
			box: boxOf(element),
		})),
	};
}

function rowSceneOf(row: Element): RowScene {
	return {
		paneId: row.getAttribute(PANE_ROW_ATTRIBUTE) ?? "",
		box: boxOf(row),
		tabs: [...row.querySelectorAll(`[${TAB_ATTRIBUTE}]`)].map((tab) => ({
			id: tab.getAttribute(TAB_ATTRIBUTE) ?? "",
			box: boxOf(tab),
		})),
	};
}

function boxOf(element: Element): Box {
	const { left, top, width, height } = element.getBoundingClientRect();
	return { left, top, width, height };
}

function isInside({ x, y }: Point, box: Box): boolean {
	return x >= box.left && x <= box.left + box.width && y >= box.top && y <= box.top + box.height;
}

function insertAimOf(point: Point, row: RowScene, draggedId: string): DragAim {
	const others = row.tabs.filter((tab) => tab.id !== draggedId);
	const next = others.find((tab) => point.x < tab.box.left + tab.box.width / 2);
	const last = others[others.length - 1];
	const markX = next?.box.left ?? (last === undefined ? row.box.left : last.box.left + last.box.width);
	return {
		kind: "insert",
		paneId: row.paneId,
		before: next?.id ?? null,
		mark: {
			left: markX - MARK_PX / 2,
			top: row.box.top,
			width: MARK_PX,
			height: row.box.height,
		},
	};
}

function bodyAimOf(point: Point, body: BodyScene): DragAim {
	const side = edgeSideOf(point, body.box);

	if (side === null) {
		return {
			kind: "append",
			paneId: body.paneId,
			zone: body.box,
		};
	}

	return {
		kind: "split",
		paneId: body.paneId,
		side,
		zone: halfOf(body.box, side),
	};
}

function edgeSideOf(point: Point, box: Box): SplitSide | null {
	const distances: readonly (readonly [SplitSide, number])[] = [
		["left", (point.x - box.left) / box.width],
		["right", (box.left + box.width - point.x) / box.width],
		["top", (point.y - box.top) / box.height],
		["bottom", (box.top + box.height - point.y) / box.height],
	];
	const [side, share] = distances.reduce((nearest, candidate) => (candidate[1] < nearest[1] ? candidate : nearest));
	return share < EDGE_SHARE ? side : null;
}

function halfOf(box: Box, side: SplitSide): Box {
	const half = { width: box.width / 2, height: box.height / 2 };

	if (side === "left") {
		return { ...box, width: half.width };
	}

	if (side === "right") {
		return { ...box, left: box.left + half.width, width: half.width };
	}

	if (side === "top") {
		return { ...box, height: half.height };
	}

	return { ...box, top: box.top + half.height, height: half.height };
}
