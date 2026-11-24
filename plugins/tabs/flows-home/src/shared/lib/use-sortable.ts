import { useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";
import { movedOnto } from "./tile-order.js";

export const TILE_ATTRIBUTE = "data-tile-id";

interface Lift {
	readonly id: string;
	readonly order: readonly string[];
}

export interface Sortable {
	readonly order: readonly string[];
	readonly liftedId: string | null;
	begin(id: string, event: PointerEvent<HTMLElement>): void;
}

export function useSortable(
	ids: readonly string[],
	area: RefObject<HTMLElement | null>,
	onSorted: (ids: readonly string[]) => void,
): Sortable {
	const lifted = useRef<Lift | null>(null);
	const [shown, setShown] = useState<Lift | null>(null);
	const lift = (next: Lift | null): void => {
		lifted.current = next;
		setShown(next);
	};
	const begin = (id: string, event: PointerEvent<HTMLElement>): void => {
		event.preventDefault();
		lift({ id, order: ids });
		const move = (pointer: globalThis.PointerEvent): void => {
			const held = lifted.current;
			const over = tileIdAt(area.current, pointer.clientX, pointer.clientY);

			if (held === null || over === null) {
				return;
			}

			const order = movedOnto(held.order, held.id, over);

			if (!isSameOrder(order, held.order)) {
				lift({ id: held.id, order });
			}
		};
		const end = (): void => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", end);
			const held = lifted.current;
			lift(null);

			if (held !== null && !isSameOrder(held.order, ids)) {
				onSorted(held.order);
			}
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", end);
	};
	return {
		order: shown?.order ?? ids,
		liftedId: shown?.id ?? null,
		begin,
	};
}

function tileIdAt(area: HTMLElement | null, x: number, y: number): string | null {
	const tiles = [...(area?.querySelectorAll<HTMLElement>(`[${TILE_ATTRIBUTE}]`) ?? [])];
	const over = tiles.find((tile) => {
		const box = tile.getBoundingClientRect();
		return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
	});
	return over?.getAttribute(TILE_ATTRIBUTE) ?? null;
}

function isSameOrder(first: readonly string[], second: readonly string[]): boolean {
	return first.length === second.length && first.every((id, at) => id === second[at]);
}
