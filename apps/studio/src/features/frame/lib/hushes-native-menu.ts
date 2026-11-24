import type { MouseEvent } from "react";

const EDITABLE = "input, textarea, [contenteditable=''], [contenteditable='true']";

export function hushesNativeMenu(event: MouseEvent): void {
	if (event.target instanceof Element && event.target.closest(EDITABLE) !== null) {
		return;
	}

	event.preventDefault();
}
