import { useCallback } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { CARRIED_CHAT, PointerCarry, isPointInBox } from "@widgetarium/behaviors";
import type { CarriedItem } from "@widgetarium/behaviors";

const PRIMARY_BUTTON = 0;
const COLUMN = "[data-shell-column]";
const NOT_A_HANDLE = "input, textarea, button, [contenteditable]";

export function useCarriesChat(
	chat: Omit<CarriedItem, "kind">,
	onTaken: () => void,
): (event: ReactPointerEvent) => void {
	const { id, title } = chat;
	return useCallback(
		(event: ReactPointerEvent) => startCarry(event, { kind: CARRIED_CHAT, id, title }, onTaken),
		[id, title, onTaken],
	);
}

function startCarry(event: ReactPointerEvent, item: CarriedItem, onTaken: () => void): void {
	if (
		event.button !== PRIMARY_BUTTON ||
		(event.target instanceof Element && event.target.closest(NOT_A_HANDLE) !== null)
	) {
		return;
	}

	const column = event.currentTarget.closest(COLUMN);
	new PointerCarry({
		item,
		start: [event.clientX, event.clientY],
		isHome: (x, y) => column !== null && isPointInBox(column.getBoundingClientRect(), x, y),
		onTaken,
	}).listen();
}
