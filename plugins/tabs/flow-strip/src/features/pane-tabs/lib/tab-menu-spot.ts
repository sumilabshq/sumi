import type { MouseEvent } from "react";

export interface TabMenuSpot {
	readonly x: number;
	readonly y: number;
}

export function tabMenuSpotOf(event: MouseEvent<HTMLElement>): TabMenuSpot {
	const isFromKeyboard = event.clientX === 0 && event.clientY === 0;

	if (!isFromKeyboard) {
		return { x: event.clientX, y: event.clientY };
	}

	const tab = event.currentTarget.getBoundingClientRect();
	return { x: tab.left, y: tab.bottom };
}
