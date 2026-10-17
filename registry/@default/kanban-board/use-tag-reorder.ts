import { useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { listenToWindow } from "widgetarium/kit";
import type { TagRowProps, Tones } from "./types";

type TagDrag = { at: number; list: string[]; isDragging: boolean };

const TAP_SLOP_PX = 4;

export function useTagReorder(
	tags: string[],
	tones: Tones,
	onWrite: TagRowProps["onWrite"],
	listRef: RefObject<HTMLDivElement | null>,
) {
	const [dragged, setDragged] = useState<TagDrag | null>(null);

	const grab = (at: number) => (event: ReactPointerEvent<HTMLButtonElement>) => {
		if (event.button) return;
		const start = { x: event.clientX, y: event.clientY };
		const drag = { at, list: tags, isDragging: false };

		const move = (pointer: PointerEvent) => {
			const isPastTapSlop =
				Math.abs(pointer.clientX - start.x) > TAP_SLOP_PX || Math.abs(pointer.clientY - start.y) > TAP_SLOP_PX;
			if (!drag.isDragging && !isPastTapSlop) return;
			drag.isDragging = true;
			const boxes = [...(listRef.current?.querySelectorAll(".otd-tag") ?? [])].map((node) =>
				node.getBoundingClientRect(),
			);
			const to = dropIndex(boxes, pointer.clientX, pointer.clientY);
			if (to < 0 || to === drag.at) return setDragged({ ...drag });
			drag.list = moveWithin(drag.list, drag.at, to);
			drag.at = to;
			setDragged({ ...drag });
		};

		const on = { of: event.currentTarget };
		const stop = () => {
			for (const unlisten of listening) {
				unlisten();
			}

			setDragged(null);
			if (!drag.isDragging) return;
			swallowNextClick(on.of);
			if (drag.list.join("\n") !== tags.join("\n")) onWrite(drag.list, tones);
		};

		const listening = [listenToWindow("pointermove", move, on), listenToWindow("pointerup", stop, on)];
	};

	return { dragged, grab };
}

function dropIndex(boxes: DOMRect[], x: number, y: number): number {
	let landed = -1;
	let nearest = Infinity;
	boxes.forEach((box, at) => {
		const dx = x - (box.left + box.width / 2);
		const dy = y - (box.top + box.height / 2);
		const far = dx * dx + dy * dy;
		if (far >= nearest) return;
		nearest = far;
		landed = at;
	});
	return landed;
}

function moveWithin(list: string[], from: number, to: number): string[] {
	const next = [...list];
	const [moving] = next.splice(from, 1);
	if (!moving) return list;
	next.splice(to, 0, moving);
	return next;
}

function swallowNextClick(of: Element) {
	const swallow = (event: Event) => {
		event.stopPropagation();
		event.preventDefault();
		release();
	};
	const release = listenToWindow("click", swallow, { of, capture: true });
	setTimeout(release, 0);
}
