import type { TabDrop } from "@widgetarium/app-host";
import { isDraggedRow, placeholderRectOf } from "./drag-placeholder.js";
import { isNestableSource } from "./drag-source.js";
import type { DragSource } from "./drag-source.js";
import { essentialsDropOf, isOverEssentials } from "./essentials-aim.js";
import {
	bottomOf,
	chatRowOf,
	chatRowsOf,
	findMeasuredList,
	groupUnitOf,
	listTopOf,
	memberIdsOf,
	middleOf,
	scrolledOf,
	splitUnitOf,
} from "./sidebar-layout.js";
import type {
	Measured,
	MeasuredGroup,
	MeasuredList,
	MeasuredSplit,
	MeasuredUnit,
	SidebarLayout,
} from "./sidebar-layout.js";
import { listDrop, splitDrop } from "./tab-drops.js";
import type { ListDrop, SplitDrop } from "./tab-drops.js";

export interface DropAim {
	readonly x: number;
	readonly y: number;
	readonly current: TabDrop;
}

const NEST_REACH_PX = 2;

export function dropOf(layout: SidebarLayout, source: DragSource, aim: DropAim): TabDrop {
	if (aim.current.kind !== "own-window" && (isOnPlaceholder(layout, source, aim) || isOnNestingChat(layout, aim))) {
		return aim.current;
	}

	if (isOverEssentials(layout, source, aim)) {
		return essentialsDropOf(layout, source, aim);
	}

	return listedDropOf(layout, source, aim);
}

export function stillDropOf(layout: SidebarLayout, source: DragSource): TabDrop {
	if (source.kind === "essential") {
		return {
			kind: "essentials",
			at: source.at,
		};
	}

	if (source.kind === "tab" && source.splitId !== null) {
		const members = memberIdsOf(splitUnitOf(layout, source.splitId));
		return splitDrop(source.splitId, members[members.indexOf(source.id) + 1] ?? null);
	}

	const siblings = siblingIdsOf(layout, source);
	const groupId = source.kind === "tab" ? source.groupId : null;
	return listDrop(source.list, groupId, siblings[siblings.indexOf(source.id) + 1] ?? null);
}

function listedDropOf(layout: SidebarLayout, source: DragSource, aim: DropAim): TabDrop {
	const listedY = aim.y + scrolledOf(layout);
	const homeSplit = homeSplitUnder(layout, source, listedY);

	if (homeSplit !== undefined) {
		return homeSplitDropOf(homeSplit, source, listedY);
	}

	const first = layout.lists[0];

	if (first === undefined) {
		return aim.current;
	}

	const list = listAtY(layout, source, listedY) ?? first;
	return nestDropOf(layout, list, source, listedY) ?? listDropOf(list, source, listedY);
}

function isOnPlaceholder(layout: SidebarLayout, source: DragSource, { x, y, current }: DropAim): boolean {
	const rect = placeholderRectOf(layout, source, current);

	if (rect === null) {
		return false;
	}

	const isTile = layout.grid.tiles.some((tile) => tile.id === source.id);
	const atY = isTile ? y : y + scrolledOf(layout);
	return x >= rect.left && x <= rect.left + rect.width && atY >= rect.top && atY <= bottomOf(rect);
}

function isOnNestingChat(layout: SidebarLayout, { x, y, current }: DropAim): boolean {
	if (current.kind !== "list") {
		return false;
	}

	const chat = chatRowOf(layout, current.list);

	if (chat === undefined) {
		return false;
	}

	const atY = y + scrolledOf(layout);
	const { rect } = chat;
	return x >= rect.left && x <= rect.left + rect.width && atY >= rect.top && atY < bottomOf(rect) + NEST_REACH_PX;
}

function listAtY(layout: SidebarLayout, source: DragSource, y: number): MeasuredList | undefined {
	const isNestable = isNestableIn(layout, source);
	return layout.lists.filter((list) => listTopOf(list) <= y && isOpenTo(list, isNestable, y)).at(-1);
}

function isOpenTo(list: MeasuredList, isNestable: boolean, y: number): boolean {
	if (!list.isNested) {
		return true;
	}

	return isNestable && y <= bottomOf(list.rect);
}

function isNestableIn(layout: SidebarLayout, source: DragSource): boolean {
	if (source.kind !== "group") {
		return isNestableSource(source);
	}

	return groupUnitOf(layout, source.id)?.holdsChat === false;
}

function nestDropOf(layout: SidebarLayout, list: MeasuredList, source: DragSource, y: number): ListDrop | null {
	if (!isNestableIn(layout, source)) {
		return null;
	}

	const chat = chatRowsOf(list).find(
		(row) => row.id !== source.id && !row.isFolded && y >= middleOf(row.rect) && y < bottomOf(row.rect) + NEST_REACH_PX,
	);

	if (chat === undefined) {
		return null;
	}

	const firstChild = findMeasuredList(layout, chat.id)?.units.find((unit) => !isDraggedRow(source, unit));
	return listDrop(chat.id, null, firstChild?.id ?? null);
}

function listDropOf(list: MeasuredList, source: DragSource, y: number): TabDrop {
	return groupTailDropOf(list, source, y) ?? beforeUnitDropOf(list, source, y) ?? listDrop(list.id, null, null);
}

function groupTailDropOf(list: MeasuredList, source: DragSource, y: number): ListDrop | null {
	if (source.kind === "group") {
		return null;
	}

	const group = list.units.find(
		(unit) => unit.kind === "group" && unit.id !== source.id && isInGroupTail(unit, source, y),
	);
	return group === undefined ? null : listDrop(list.id, group.id, null);
}

function isInGroupTail(group: MeasuredGroup, source: DragSource, y: number): boolean {
	const rows = group.rows.filter((row) => !isDraggedRow(source, row));
	const floor = middleOf(rows.at(-1)?.rect ?? group.head);
	return y >= floor && y <= bottomOf(group.rect);
}

function beforeUnitDropOf(list: MeasuredList, source: DragSource, y: number): TabDrop | null {
	for (const unit of list.units) {
		if (isDraggedRow(source, unit)) {
			continue;
		}

		if (y < middleOf(unit.kind === "group" ? unit.head : unit.rect)) {
			return listDrop(list.id, null, beforeIdOf(unit, source));
		}

		const row = openRowBelowOf(unit, source, y);

		if (row !== undefined) {
			return listDrop(list.id, unit.id, row.id);
		}
	}

	return null;
}

function openRowBelowOf(unit: MeasuredUnit, source: DragSource, y: number): Measured | undefined {
	if (unit.kind !== "group" || !unit.isOpen || source.kind === "group") {
		return undefined;
	}

	return unit.rows.find((row) => !isDraggedRow(source, row) && y < middleOf(row.rect));
}

function beforeIdOf(unit: MeasuredUnit, source: DragSource): string {
	if (unit.kind !== "split") {
		return unit.id;
	}

	return memberIdsOf(unit).find((id) => id !== source.id) ?? unit.anchorId;
}

function homeSplitDropOf(split: MeasuredSplit, source: DragSource, y: number): SplitDrop {
	const before = split.parts.find((part) => part.id !== null && part.id !== source.id && y < middleOf(part.rect));
	return splitDrop(split.id, before?.id ?? null);
}

function homeSplitUnder(layout: SidebarLayout, source: DragSource, y: number): MeasuredSplit | undefined {
	if (source.kind !== "tab" || source.splitId === null) {
		return undefined;
	}

	const split = splitUnitOf(layout, source.splitId);
	return split !== undefined && split.isOpen && y >= split.members.top && y <= bottomOf(split.members)
		? split
		: undefined;
}

function siblingIdsOf(layout: SidebarLayout, source: Exclude<DragSource, { kind: "essential" }>): readonly string[] {
	if (source.kind === "tab" && source.groupId !== null) {
		return groupUnitOf(layout, source.groupId)?.rows.map((row) => row.id) ?? [];
	}

	return (findMeasuredList(layout, source.list)?.units ?? []).map((unit) => beforeIdOf(unit, source));
}
