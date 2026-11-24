import { useState } from "react";
import type { PointerEvent } from "react";
import { trackPointer } from "../../../shared/lib/track-pointer.js";
import type { Point } from "../../../shared/lib/track-pointer.js";
import { aimAt, sceneOf } from "./drag-aim.js";
import type { DragAim } from "./drag-aim.js";

export interface DraggedTab {
	readonly id: string;
	readonly label: string;
}

export interface Lifted {
	readonly tabId: string;
	readonly label: string;
	readonly point: Point;
	readonly aim: DragAim | null;
}

export interface TabDrag {
	readonly lifted: Lifted | null;
	readonly press: (tab: DraggedTab, event: PointerEvent<HTMLElement>) => void;
}

export interface TabDragNeeds {
	readonly onDrop: (tabId: string, aim: DragAim) => void;
}

const LIFT_DISTANCE_PX = 4;
const PRIMARY_BUTTON = 0;

export function useTabDrag({ onDrop }: TabDragNeeds): TabDrag {
	const [lifted, setLifted] = useState<Lifted | null>(null);
	const press: TabDrag["press"] = (tab, event) => {
		if (event.button === PRIMARY_BUTTON) {
			watchPress({ tab, start: { x: event.clientX, y: event.clientY }, setLifted, onDrop });
		}
	};
	return { lifted, press };
}

interface PressWatch {
	readonly tab: DraggedTab;
	readonly start: Point;
	readonly setLifted: (lifted: Lifted | null) => void;
	readonly onDrop: (tabId: string, aim: DragAim) => void;
}

function watchPress({ tab, start, setLifted, onDrop }: PressWatch): void {
	const state = { isLifted: false };
	trackPointer({
		onMove: (point) => {
			state.isLifted = state.isLifted || Math.hypot(point.x - start.x, point.y - start.y) >= LIFT_DISTANCE_PX;

			if (state.isLifted) {
				setLifted(liftedAt(tab, point));
			}
		},
		onEnd: (point) => {
			setLifted(null);

			if (point !== null && state.isLifted) {
				dropAt({ tab, point, onDrop });
			}
		},
	});
}

function dropAt({ tab, point, onDrop }: { readonly tab: DraggedTab; readonly point: Point; readonly onDrop: PressWatch["onDrop"] }): void {
	const aim = aimAt(point, sceneOf(document), tab.id);

	if (aim !== null) {
		onDrop(tab.id, aim);
	}
}

function liftedAt(tab: DraggedTab, point: Point): Lifted {
	return {
		tabId: tab.id,
		label: tab.label,
		point,
		aim: aimAt(point, sceneOf(document), tab.id),
	};
}
