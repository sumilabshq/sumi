import { useRef, useState } from "react";
import type { RefObject } from "react";

export interface ChoiceGridAsk {
	readonly count: number;
	readonly listKey: string;
}

export interface ChoiceGrid {
	readonly activeIndex: number;
	readonly firstRow: number;
	readonly endRow: number;
	readonly rowCount: number;
	readonly scrollRef: RefObject<HTMLDivElement | null>;
	readonly onScroll: () => void;
	readonly moveWithKey: (key: string) => boolean;
}

export const GRID_COLUMNS = 9;
export const GRID_ROW_PX = 28;
export const GRID_VIEW_ROWS = 7;

const OVERSCAN_ROWS = 3;
const STEP_OF_KEY: ReadonlyMap<string, number> = new Map([
	["ArrowLeft", -1],
	["ArrowRight", 1],
	["ArrowUp", -GRID_COLUMNS],
	["ArrowDown", GRID_COLUMNS],
]);

interface ListPlace {
	readonly listKey: string;
	readonly activeIndex: number;
	readonly scrollTop: number;
}

export function choiceIdOf(gridId: string, index: number): string {
	return `${gridId}-${index}`;
}

export function useChoiceGrid({ count, listKey }: ChoiceGridAsk): ChoiceGrid {
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const [held, setHeld] = useState<ListPlace>({
		listKey,
		activeIndex: 0,
		scrollTop: 0,
	});
	const place = held.listKey === listKey ? held : { listKey, activeIndex: 0, scrollTop: 0 };
	const rowCount = Math.ceil(count / GRID_COLUMNS);
	const scrolledRow = Math.floor(place.scrollTop / GRID_ROW_PX);
	return {
		activeIndex: Math.min(place.activeIndex, count - 1),
		firstRow: Math.max(0, scrolledRow - OVERSCAN_ROWS),
		endRow: Math.min(rowCount, scrolledRow + GRID_VIEW_ROWS + OVERSCAN_ROWS + 1),
		rowCount,
		scrollRef,
		onScroll: () => setHeld({ ...place, scrollTop: scrollRef.current?.scrollTop ?? 0 }),
		moveWithKey: (key) => {
			const step = STEP_OF_KEY.get(key);
			if (step === undefined || count === 0) {
				return false;
			}

			const activeIndex = Math.min(Math.max(place.activeIndex + step, 0), count - 1);
			setHeld({ ...place, activeIndex });
			scrollRowIntoView(scrollRef.current, Math.floor(activeIndex / GRID_COLUMNS));
			return true;
		},
	};
}

function scrollRowIntoView(view: HTMLDivElement | null, row: number): void {
	if (view === null) {
		return;
	}

	const rowTop = row * GRID_ROW_PX;
	const viewPx = GRID_VIEW_ROWS * GRID_ROW_PX;

	if (rowTop < view.scrollTop) {
		view.scrollTop = rowTop;
	}

	if (rowTop + GRID_ROW_PX > view.scrollTop + viewPx) {
		view.scrollTop = rowTop + GRID_ROW_PX - viewPx;
	}
}
