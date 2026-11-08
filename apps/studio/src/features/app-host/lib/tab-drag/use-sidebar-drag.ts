import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useLiftedPress } from "@widgetarium/behaviors";
import type { GhostFace, OverlayPort } from "@widgetarium/behaviors";
import type { PendingPress } from "@widgetarium/behaviors";
import type { DragSource } from "./drag-source.js";
import type { PickedItem } from "./picked-item.js";
import type { SidebarDragParts } from "./sidebar-drag-parts.js";
import { TabDragSession } from "./tab-drag-session.js";
import type { OnTabDrop, TabDragAsk } from "./tab-drag-session.js";
import { TetheredPull, isHeldElsewhere } from "./tethered-pull.js";
import { contentStartOf, rectOf } from "./sidebar-measure.js";
import { listIdOf, tabRefOf } from "../tabs-sidebar/pointed-of.js";
import type { TabRef } from "./tab-ref.js";

const NOT_A_HANDLE = "button:not([data-tabs-item]), input";
const DRAGGED_ITEM = '[data-tabs-item="tab"], [data-tabs-item="essential"], [data-tabs-item="group"]';
const DRAGGED_WORDS = "[data-tabs-words]";

export interface SidebarDragging {
	readonly parts: SidebarDragParts;
	readonly onDrop: OnTabDrop;
	readonly onTearOff: (source: TabRef) => void;
	readonly tearOffGhost: OverlayPort;
	readonly opensOwnWindows: boolean;
}

type Dropping = Pick<TabDragAsk, "preview" | "laidOut" | "onDrop" | "onTearOff" | "tearOffGhost">;

interface PressedItem extends PendingPress {
	readonly picked: PickedItem;
}

export function useSidebarDrag(holder: RefObject<HTMLElement | null>, dragging: SidebarDragging): void {
	const session = useRef<TabDragSession | TetheredPull | null>(null);
	useLiftedPress<PressedItem>(holder, {
		pressOf: (element, event) => pressedItemOf(element, event, dragging.opensOwnWindows),
		onLift: (element, press, now) => {
			session.current?.abandon();
			session.current = isHeldElsewhere(press.picked.element)
				? tetheredPullOf(element, press)
				: createTabDragSession(element, press, now, dragging);
			session.current.start();
		},
	});
	useEffect(() => () => session.current?.abandon(), []);
}

function tetheredPullOf(holder: HTMLElement, { picked, pointerId, start }: PressedItem): TetheredPull {
	return new TetheredPull({
		holder,
		row: picked.element,
		tabId: picked.source.id,
		pointerId,
		start,
	});
}

function createTabDragSession(
	holder: HTMLElement,
	{ picked, pointerId, start }: PressedItem,
	now: readonly [number, number],
	dragging: SidebarDragging,
): TabDragSession {
	return new TabDragSession({
		holder,
		picked,
		face: ghostFaceOf(picked, start),
		pointerId,
		start: now,
		...droppingOf(dragging),
	});
}

function droppingOf({ parts, onDrop, onTearOff, tearOffGhost }: SidebarDragging): Dropping {
	return {
		preview: parts.preview,
		laidOut: parts.laidOut,
		onDrop,
		onTearOff,
		tearOffGhost,
	};
}

function pressedItemOf(holder: HTMLElement, event: PointerEvent, opensOwnWindows: boolean): PressedItem | null {
	const element = draggedElementOf(holder, event);
	const id = element?.dataset["tabsId"];

	if (element === null || id === undefined) {
		return null;
	}

	return {
		picked: pickedOf(element, sourceOf(holder, element, id), opensOwnWindows),
		pointerId: event.pointerId,
		start: [event.clientX, event.clientY],
	};
}

function draggedElementOf(holder: HTMLElement, event: PointerEvent): HTMLElement | null {
	if (!(event.target instanceof Element) || event.target.closest(NOT_A_HANDLE) !== null) {
		return null;
	}

	const element = event.target.closest<HTMLElement>(DRAGGED_ITEM);
	return element !== null && holder.contains(element) ? element : null;
}

function pickedOf(element: HTMLElement, source: DragSource, opensOwnWindows: boolean): PickedItem {
	return {
		element,
		source,
		opensOwnWindow: opensOwnWindows && source.kind === "tab" && isTearableApp(element),
	};
}

function ghostFaceOf({ element, source }: PickedItem, [x, y]: readonly [number, number]): GhostFace {
	const from = rectOf(element);
	return {
		art: source.kind === "group" ? null : element.firstElementChild,
		title: (element.querySelector(DRAGGED_WORDS)?.textContent ?? element.getAttribute("aria-label") ?? "").trim(),
		grabOffset: [x - from.left, y - from.top],
		contentStart: contentStartOf(element),
	};
}

function sourceOf(holder: HTMLElement, element: HTMLElement, id: string): DragSource {
	const kind = element.dataset["tabsItem"];

	if (kind === "tab") {
		return {
			kind: "tab",
			...tabRefOf(element, id),
		};
	}

	if (kind === "group") {
		return groupSourceOf(element, id);
	}

	return essentialSourceOf(holder, element, id);
}

function groupSourceOf(element: HTMLElement, id: string): DragSource {
	return {
		kind: "group",
		id,
		list: listIdOf(element),
	};
}

function essentialSourceOf(holder: HTMLElement, element: HTMLElement, id: string): DragSource {
	return {
		kind: "essential",
		id,
		at: [...holder.querySelectorAll('[data-tabs-item="essential"]')].indexOf(element),
	};
}

function isTearableApp(element: HTMLElement): boolean {
	return element.dataset["tabsTearable"] !== undefined;
}
