import { useState } from "react";
import type { RefObject } from "react";
import type { SidebarSorting, SidebarSortOutside } from "@widgetarium/kit";
import { paneAimOf } from "@sumi/tab-strip-plugin";
import type { DragAim, Lifted, StripItem, TabActs } from "@sumi/tab-strip-plugin";
import { draggedItemOf } from "./dragged-item.js";

export interface SidebarDragOut {
	readonly lifted: Lifted | null;
	onSorting(sorting: SidebarSorting | null): void;
	onDropOutside(outside: SidebarSortOutside): void;
}

export function useSidebarDragOut(
	column: RefObject<HTMLElement | null>,
	items: readonly StripItem[],
	acts: TabActs,
): SidebarDragOut {
	const [lifted, setLifted] = useState<Lifted | null>(null);
	const liftedOf = ({ id, x, y }: SidebarSortOutside): Lifted | null => {
		const item = draggedItemOf(items, id);
		return item === null
			? null
			: {
					item,
					x,
					y,
					aim: aimOf(column.current, x, y),
				};
	};
	return {
		lifted,
		onSorting: (sorting) => setLifted(sorting === null || sorting.outside === null ? null : liftedOf(sorting.outside)),
		onDropOutside: (outside) => {
			const dropped = liftedOf(outside);

			if (dropped === null || dropped.aim.kind === "none") {
				console.info(`[widgetarium] sidebar drop of ${outside.id} outside the list skipped: no pane or window there`);
				return;
			}

			console.info(`[widgetarium] sidebar drop of ${outside.id} outside the list → ${dropped.aim.kind}`);
			acts.drop(dropped.item, dropped.aim);
		},
	};
}

function aimOf(column: HTMLElement | null, x: number, y: number): DragAim {
	const pageLeft = column?.getBoundingClientRect().right ?? 0;
	const view = {
		left: 0,
		top: 0,
		width: window.innerWidth,
		height: window.innerHeight,
	};
	return paneAimOf({
		x,
		y,
		view,
		page: {
			...view,
			left: pageLeft,
			width: view.width - pageLeft,
		},
	});
}
