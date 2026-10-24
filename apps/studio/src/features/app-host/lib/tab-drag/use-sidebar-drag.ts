import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { setTabDragImage } from "./drag-image.js";
import type { DragImageAsk, DragImageShape } from "./drag-image.js";
import type { PickedItem } from "./picked-item.js";
import { DRAG_MOVE, TabDragSession } from "./tab-drag-session.js";
import type { OnTabDrop } from "./tab-drag-session.js";
import type { DragSource } from "./sidebar-drop-plan.js";
import { rectOf } from "./sidebar-layout.js";
import { tabRefOf } from "../tabs-sidebar/pointed-of.js";

const TAB_DRAG_TYPE = "application/x-widgetarium-tab";

const NOT_A_HANDLE = "button:not([data-tabs-item]), input";
const DRAGGED_ITEM = '[data-tabs-item="tab"], [data-tabs-item="essential"]';
const DRAGGED_ART = "svg, img, [data-tab-art]";
const BROWSER_APP = "browser";

export interface SidebarDragging {
	readonly onDrop: OnTabDrop;
	readonly onTearOff: (tabId: string) => void;
	readonly opensOwnWindows: boolean;
}

interface Held {
	pressed: EventTarget | null;
	session: TabDragSession | null;
}

export function useSidebarDrag(holder: RefObject<HTMLElement | null>, dragging: SidebarDragging): void {
	const latest = useRef(dragging);
	latest.current = dragging;
	useEffect(() => {
		const element = holder.current;

		if (element === null) {
			return;
		}

		const held: Held = {
			pressed: null,
			session: null,
		};
		const onPointerDown = (event: PointerEvent): void => {
			held.pressed = event.target;
		};
		const onDragStart = (event: DragEvent): void => {
			held.session?.abandon();
			held.session = startDrag(element, event, held.pressed, latest.current);
		};
		element.addEventListener("pointerdown", onPointerDown);
		element.addEventListener("dragstart", onDragStart);
		return () => {
			element.removeEventListener("pointerdown", onPointerDown);
			element.removeEventListener("dragstart", onDragStart);
		};
	}, [holder]);
}

function startDrag(
	holder: HTMLElement,
	event: DragEvent,
	pressed: EventTarget | null,
	dragging: SidebarDragging,
): TabDragSession | null {
	const picked = pickedOf(holder, event, dragging);

	if (picked === null || event.dataTransfer === null || isPressOnControl(pressed)) {
		event.preventDefault();
		return null;
	}

	event.dataTransfer.setData(TAB_DRAG_TYPE, picked.source.id);
	event.dataTransfer.effectAllowed = DRAG_MOVE;
	setTabDragImage(event.dataTransfer, dragImageAskOf(picked, event));
	const session = new TabDragSession({
		holder,
		picked,
		onDrop: dragging.onDrop,
		onTearOff: dragging.onTearOff,
	});
	session.start();
	return session;
}

function isPressOnControl(pressed: EventTarget | null): boolean {
	return pressed instanceof Element && pressed.closest(NOT_A_HANDLE) !== null;
}

function pickedOf(holder: HTMLElement, event: DragEvent, dragging: SidebarDragging): PickedItem | null {
	const element = event.target instanceof Element ? event.target.closest<HTMLElement>(DRAGGED_ITEM) : null;
	const id = element?.dataset["tabsId"];

	if (element === null || id === undefined || !holder.contains(element)) {
		return null;
	}

	const source = sourceOf(holder, element, id);
	return {
		element,
		source,
		opensOwnWindow: dragging.opensOwnWindows && source.kind === "tab" && element.dataset["hostTabApp"] === BROWSER_APP,
	};
}

function dragImageAskOf({ element, source, opensOwnWindow }: PickedItem, event: DragEvent): DragImageAsk {
	const from = rectOf(element);
	return {
		art: element.querySelector(DRAGGED_ART),
		title: (element.getAttribute("aria-label") ?? element.textContent ?? "").trim(),
		shape: shapeOf(source, opensOwnWindow),
		from,
		grab: [event.clientX - from.left, event.clientY - from.top],
	};
}

function shapeOf(source: DragSource, opensOwnWindow: boolean): DragImageShape {
	if (opensOwnWindow) {
		return "own-window";
	}

	return source.kind === "essential" ? "tile" : "row";
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
