import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { movedNow } from "@widgetarium/gpu";
import { projectedDrop } from "./projected-drop.js";
import type { Projection } from "./projected-drop.js";
import { contentY, liftCleared, liftLanded, liftMoved, liftStarted } from "./tree-rows.js";
import type { DropSlot, Lift } from "./tree-rows.js";

export interface TreeDrop {
	readonly dragged: string;
	readonly parent: string;
	readonly before: string | null;
}

export interface TreeDragAsk {
	readonly indent: number;
	readonly rebuilt: unknown;
	readonly onDrop: (drop: TreeDrop) => void;
}

export interface TreeDrag {
	readonly slot: DropSlot | null;
	readonly onPointerDown: (event: ReactPointerEvent, id: string, canDrag: boolean) => void;
	readonly wasDragged: () => boolean;
}

const STARTS_AFTER_PX = 4;
const SETTLED_AFTER_MS = 4000;

export function useTreeDrag(tree: RefObject<HTMLElement | null>, { indent, rebuilt, onDrop }: TreeDragAsk): TreeDrag {
	const [slot, setSlot] = useState<DropSlot | null>(null);
	const lift = useRef<Lift | null>(null);
	const dragged = useRef(false);
	useEffect(() => {
		lift.current = null;
		setSlot(null);
		if (tree.current) liftCleared(tree.current);
	}, [rebuilt, tree]);
	const onPointerDown = (event: ReactPointerEvent, id: string, canDrag: boolean): void => {
		dragged.current = false;
		const holder = tree.current;
		if (event.button !== 0 || !holder || !canDrag) return;
		const held: Lift = {
			id,
			startX: event.clientX,
			startY: event.clientY,
			rows: [],
			elements: new Map(),
			grab: 0,
			projection: null,
		};
		lift.current = held;
		const onMove = (move: PointerEvent): void => {
			const isFar = Math.hypot(move.clientX - held.startX, move.clientY - held.startY) >= STARTS_AFTER_PX;
			if (lift.current !== held || (!dragged.current && !isFar)) return;
			if (!dragged.current) liftStarted(holder, held);
			dragged.current = true;
			movedNow();
			const pointer = { y: contentY(holder, move.clientY), dx: move.clientX - held.startX };
			const projection = projectedDrop(held.rows, held.id, pointer, held.projection?.at ?? null, indent);
			const lifted = held.rows.find((row) => row.mark === held.id);
			const shown = liftMoved(held, projection, pointer.y - held.grab - (lifted?.top ?? 0));
			if (shown !== undefined) setSlot(shown && { ...shown, left: shown.left * indent });
		};
		const onUp = (): void => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			lift.current = null;
			setSlot(null);
			if (dragged.current) dropped(holder, held, onDrop);
		};
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	};
	return { slot, onPointerDown, wasDragged: () => dragged.current };
}

function dropped(holder: HTMLElement, held: Lift, onDrop: (drop: TreeDrop) => void): void {
	const projection: Projection | null = held.projection;
	if (!projection || projection.isStill) return liftCleared(holder);
	liftLanded(held, projection);
	onDrop({ dragged: held.id, parent: projection.parent, before: projection.before });
	window.setTimeout(() => liftCleared(holder), SETTLED_AFTER_MS);
}
