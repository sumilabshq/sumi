import type { TabDrop } from "@widgetarium/app-host";
import { placeholderRectOf } from "./drag-placeholder.js";
import { isNestableSource } from "./drag-source.js";
import type { DragSource } from "./drag-source.js";
import { allChatRowsOf, bottomOf, chatRowOf, scrolledOf } from "./sidebar-layout.js";
import type { Measured, MeasuredRow, MeasuredUnit, SidebarLayout } from "./sidebar-layout.js";
import { listDrop } from "./tab-drops.js";
import type { ListDrop } from "./tab-drops.js";

export interface RefusedSlotAim {
	readonly layout: SidebarLayout;
	readonly source: DragSource;
	readonly drop: TabDrop;
	readonly chatId: string;
	readonly y: number;
}

const REFUSED_EDGE_SHARE = 0.25;

export function refusedChatOf(layout: SidebarLayout, source: DragSource, y: number): Measured | undefined {
	if (source.kind !== "tab" || isNestableSource(source)) {
		return undefined;
	}

	const listedY = y + scrolledOf(layout);
	return allChatRowsOf(layout).find((row) => row.id !== source.id && isInRefusedCore(row, listedY));
}

export function slotAboveOf(layout: SidebarLayout, id: string): ListDrop | null {
	for (const list of layout.lists) {
		const unit = list.units.find((one) => holdsRow(one, id));

		if (unit !== undefined) {
			return listDrop(list.id, unit.kind === "group" ? unit.id : null, id);
		}
	}

	return null;
}

export function isOverRefusedSlot({ layout, source, drop, chatId, y }: RefusedSlotAim): boolean {
	const placeholder = placeholderRectOf(layout, source, drop);
	const chat = chatRowOf(layout, chatId);

	if (placeholder === null || chat === undefined) {
		return false;
	}

	const listedY = y + scrolledOf(layout);
	return listedY >= placeholder.top && listedY <= refusedTopOf(chat);
}

function holdsRow(unit: MeasuredUnit, id: string): boolean {
	if (unit.kind === "group") {
		return unit.rows.some((row) => row.id === id);
	}

	return unit.kind === "split" ? unit.parts.some((part) => part.id === id) : unit.id === id;
}

function isInRefusedCore(row: MeasuredRow, listedY: number): boolean {
	return listedY > refusedTopOf(row) && listedY < bottomOf(row.cardRect) - refusedEdgeOf(row);
}

function refusedTopOf(row: MeasuredRow): number {
	return row.rect.top + refusedEdgeOf(row);
}

function refusedEdgeOf({ rect }: MeasuredRow): number {
	return rect.height * REFUSED_EDGE_SHARE;
}
