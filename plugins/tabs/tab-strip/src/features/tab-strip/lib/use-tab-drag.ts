import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { aimOf } from "./drag-aim.js";
import type { AimFacts, Box, DragAim } from "./drag-aim.js";
import { itemIdOf } from "./strip-items.js";
import type { StripItem } from "./strip-items.js";

export interface Lifted {
	readonly item: StripItem;
	readonly x: number;
	readonly y: number;
	readonly aim: DragAim;
}

export interface TabDrag {
	readonly lifted: Lifted | null;
	readonly press: (item: StripItem, event: ReactPointerEvent<HTMLElement>) => void;
	readonly wasDragged: () => boolean;
}

export type TabDropped = (item: StripItem, aim: DragAim) => void;

interface Moving {
	aim: DragAim | null;
	frame: number | null;
	pointer: PointerEvent | null;
}

const PRIMARY_BUTTON = 0;
const PULL_PX = 4;
const ITEM_SELECTOR = "[data-strip-item]";
const TITLE_BAR_SELECTOR = "[data-title-bar]";
const ESCAPE = "Escape";

export function useTabDrag(strip: RefObject<HTMLElement | null>, onDrop: TabDropped): TabDrag {
	const [lifted, setLifted] = useState<Lifted | null>(null);
	const latestDrop = useRef(onDrop);
	latestDrop.current = onDrop;
	const session = useRef<AbortController | null>(null);
	const isDropped = useRef(false);
	useEffect(() => () => session.current?.abort(), []);
	const press = (item: StripItem, event: ReactPointerEvent<HTMLElement>): void => {
		if (event.button !== PRIMARY_BUTTON) {
			return;
		}

		session.current?.abort();
		isDropped.current = false;
		event.currentTarget.setPointerCapture(event.pointerId);
		const ending = new AbortController();
		session.current = ending;
		const startX = event.clientX;
		const startY = event.clientY;
		const moving: Moving = {
			aim: null,
			frame: null,
			pointer: null,
		};
		const paint = (): void => {
			moving.frame = null;
			const pointer = moving.pointer;

			if (pointer === null) {
				return;
			}

			moving.aim = aimOf(factsOf(strip.current, itemIdOf(item), pointer));
			setLifted({
				item,
				x: pointer.clientX,
				y: pointer.clientY,
				aim: moving.aim,
			});
		};
		const move = (pointer: PointerEvent): void => {
			if (
				moving.aim === null &&
				moving.frame === null &&
				Math.hypot(pointer.clientX - startX, pointer.clientY - startY) < PULL_PX
			) {
				return;
			}

			moving.pointer = pointer;
			moving.frame ??= requestAnimationFrame(paint);
		};
		const end = (isPlaced: boolean): void => {
			ending.abort();

			if (moving.frame !== null) {
				cancelAnimationFrame(moving.frame);
				paint();
			}

			setLifted(null);

			if (moving.aim === null) {
				return;
			}

			isDropped.current = true;

			if (isPlaced) {
				latestDrop.current(item, moving.aim);
			}
		};
		const { signal } = ending;
		window.addEventListener("pointermove", move, { signal });
		window.addEventListener("pointerup", () => end(true), { signal });
		window.addEventListener("pointercancel", () => end(false), { signal });
		window.addEventListener(
			"keydown",
			(key) => {
				if (key.key === ESCAPE) {
					end(false);
				}
			},
			{ signal },
		);
	};
	return {
		lifted,
		press,
		wasDragged: () => {
			const was = isDropped.current;
			isDropped.current = false;
			return was;
		},
	};
}

function factsOf(strip: HTMLElement | null, draggedId: string, pointer: PointerEvent): AimFacts {
	const view = {
		left: 0,
		top: 0,
		width: window.innerWidth,
		height: window.innerHeight,
	};
	const titleBar = strip?.closest(TITLE_BAR_SELECTOR) ?? strip;
	const pageTop = titleBar?.getBoundingClientRect().bottom ?? 0;
	return {
		x: pointer.clientX,
		y: pointer.clientY,
		strip: strip === null ? view : boxOf(strip),
		tabs: strip === null ? [] : otherTabBoxesOf(strip, draggedId),
		page: {
			...view,
			top: pageTop,
			height: view.height - pageTop,
		},
		view,
	};
}

function otherTabBoxesOf(strip: HTMLElement, draggedId: string): readonly Box[] {
	return [...strip.querySelectorAll<HTMLElement>(ITEM_SELECTOR)]
		.filter((tab) => tab.dataset["stripItem"] !== draggedId)
		.map(boxOf);
}

function boxOf(element: Element): Box {
	const { left, top, width, height } = element.getBoundingClientRect();
	return {
		left,
		top,
		width,
		height,
	};
}
