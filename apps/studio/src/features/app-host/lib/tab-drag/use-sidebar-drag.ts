import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useLiftedPress } from "@widgetarium/behaviors";
import type { GhostFace, OverlayPort } from "@widgetarium/behaviors";
import type { PendingPress } from "@widgetarium/behaviors";
import type { PickedItem } from "./picked-item.js";
import { TabDragSession } from "./tab-drag-session.js";
import { TetheredPull, isHeldElsewhere } from "./tethered-pull.js";
import type { OnTabDrop } from "./tab-drag-session.js";
import type { DragSource } from "./sidebar-drop-plan.js";
import { rectOf } from "./sidebar-layout.js";
import { tabRefOf } from "../tabs-sidebar/pointed-of.js";
import type { TabRef } from "./tab-ref.js";

const NOT_A_HANDLE = "button:not([data-tabs-item]), input";
const DRAGGED_ITEM = '[data-tabs-item="tab"], [data-tabs-item="essential"]';
const DRAGGED_WORDS = "[data-tabs-words]";
const TEARABLE_APPS: ReadonlySet<string | undefined> = new Set(["browser", "chat"]);

export interface SidebarDragging {
	readonly onDrop: OnTabDrop;
	readonly onTearOff: (source: TabRef) => void;
	readonly tearOffGhost: OverlayPort;
	readonly opensOwnWindows: boolean;
}

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
		onDrop: dragging.onDrop,
		onTearOff: dragging.onTearOff,
		tearOffGhost: dragging.tearOffGhost,
	});
}

function pressedItemOf(holder: HTMLElement, event: PointerEvent, opensOwnWindows: boolean): PressedItem | null {
	if (!(event.target instanceof Element) || event.target.closest(NOT_A_HANDLE) !== null) {
		return null;
	}

	const element = event.target.closest<HTMLElement>(DRAGGED_ITEM);
	const id = element?.dataset["tabsId"];

	if (element === null || id === undefined || !holder.contains(element)) {
		return null;
	}

	const source = sourceOf(holder, element, id);
	return {
		picked: {
			element,
			source,
			opensOwnWindow: opensOwnWindows && source.kind === "tab" && isTearableApp(element),
		},
		pointerId: event.pointerId,
		start: [event.clientX, event.clientY],
	};
}

function ghostFaceOf({ element }: PickedItem, [x, y]: readonly [number, number]): GhostFace {
	const from = rectOf(element);
	return {
		art: element.firstElementChild,
		title: (element.querySelector(DRAGGED_WORDS)?.textContent ?? element.getAttribute("aria-label") ?? "").trim(),
		grabOffset: [x - from.left, y - from.top],
	};
}

function sourceOf(holder: HTMLElement, element: HTMLElement, id: string): DragSource {
	if (element.dataset["tabsItem"] === "tab") {
		return {
			kind: "tab",
			...tabRefOf(element, id),
		};
	}

	return {
		kind: "essential",
		id,
		at: [...holder.querySelectorAll('[data-tabs-item="essential"]')].indexOf(element),
	};
}

function isTearableApp(element: HTMLElement): boolean {
	return TEARABLE_APPS.has(element.dataset["hostTabApp"]);
}
