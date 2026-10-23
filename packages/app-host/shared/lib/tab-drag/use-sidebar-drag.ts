import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { DragFollow } from "./drag-follow.js";
import { SidebarDrag } from "./sidebar-drag.js";
import type { OnTabDrop, PickedItem, TearOffWatch } from "./sidebar-drag.js";
import type { DragSource } from "./sidebar-drop-plan.js";
import { tabRefOf } from "../tabs-sidebar/pointed-of.js";

const PRIMARY_BUTTON = 0;
const NOT_A_HANDLE = "button:not([data-tabs-item]), input";
const DRAGGED_ITEM = '[data-tabs-item="tab"], [data-tabs-item="essential"]';
const BROWSER_APP = "browser";

export interface SidebarDragging {
	readonly onDrop: OnTabDrop;
	readonly opensOwnWindows: boolean;
	readonly tearOffOf: (tabId: string) => TearOffWatch;
}

export function useSidebarDrag(holder: RefObject<HTMLElement | null>, dragging: SidebarDragging): void {
	const latest = useRef(dragging);
	latest.current = dragging;
	useEffect(() => {
		const element = holder.current;

		if (element === null) {
			return;
		}

		const onPointerDown = (event: PointerEvent): void => startDrag(element, event, latest.current);
		element.addEventListener("pointerdown", onPointerDown);
		return () => element.removeEventListener("pointerdown", onPointerDown);
	}, [holder]);
}

function startDrag(holder: HTMLElement, event: PointerEvent, dragging: SidebarDragging): void {
	const picked = pickedOf(holder, event, dragging);

	if (picked === null) {
		return;
	}

	new DragFollow(new SidebarDrag(holder, picked, dragging.onDrop, [event.clientX, event.clientY])).listen();
}

function pickedOf(holder: HTMLElement, event: PointerEvent, dragging: SidebarDragging): PickedItem | null {
	const element = handleOf(event);
	const id = element?.dataset["tabsId"];

	if (element === null || id === undefined || !holder.contains(element)) {
		return null;
	}

	const source = sourceOf(holder, element, id);
	const opensOwnWindow =
		dragging.opensOwnWindows && source.kind === "tab" && element.dataset["hostTabApp"] === BROWSER_APP;
	return {
		element,
		source,
		pointerId: event.pointerId,
		opensOwnWindow,
		tearOff: opensOwnWindow ? dragging.tearOffOf(source.id) : null,
	};
}

function handleOf(event: PointerEvent): HTMLElement | null {
	if (
		event.button !== PRIMARY_BUTTON ||
		!(event.target instanceof Element) ||
		event.target.closest(NOT_A_HANDLE) !== null
	) {
		return null;
	}

	return event.target.closest<HTMLElement>(DRAGGED_ITEM);
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
