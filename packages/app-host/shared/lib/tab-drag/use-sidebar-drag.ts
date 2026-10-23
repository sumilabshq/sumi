import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { DragFollow } from "./drag-follow.js";
import { SidebarDrag } from "./sidebar-drag.js";
import type { OnTabDrop, PickedItem } from "./sidebar-drag.js";
import type { DragSource } from "./sidebar-drop-plan.js";
import { tabRefOf } from "../tabs-sidebar/pointed-of.js";

const PRIMARY_BUTTON = 0;
const NOT_A_HANDLE = "button:not([data-tabs-item]), input";
const DRAGGED_ITEM = '[data-tabs-item="tab"], [data-tabs-item="essential"]';

export function useSidebarDrag(holder: RefObject<HTMLElement | null>, onDrop: OnTabDrop): void {
	const dropped = useRef(onDrop);
	dropped.current = onDrop;
	useEffect(() => {
		const element = holder.current;

		if (element === null) {
			return;
		}

		const onPointerDown = (event: PointerEvent): void =>
			startDrag(element, event, (source, drop) => dropped.current(source, drop));
		element.addEventListener("pointerdown", onPointerDown);
		return () => element.removeEventListener("pointerdown", onPointerDown);
	}, [holder]);
}

function startDrag(holder: HTMLElement, event: PointerEvent, onDrop: OnTabDrop): void {
	const picked = pickedOf(holder, event);

	if (picked === null) {
		return;
	}

	new DragFollow(new SidebarDrag(holder, picked, onDrop, [event.clientX, event.clientY])).listen();
}

function pickedOf(holder: HTMLElement, event: PointerEvent): PickedItem | null {
	const element = handleOf(event);
	const id = element?.dataset["tabsId"];

	if (element === null || id === undefined || !holder.contains(element)) {
		return null;
	}

	return {
		element,
		source: sourceOf(holder, element, id),
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
