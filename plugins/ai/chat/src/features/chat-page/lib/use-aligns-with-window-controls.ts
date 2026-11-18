import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

// TRADE-OFF: copies trafficLightPosition.x of apps/tauri/src-tauri/tauri.conf.json; the window reports no position
const WINDOW_CONTROLS_X_PX = 16;
const WINDOW_CONTROLS_X_VAR = "--wg-chat-window-controls-x";
const WINDOW_CONTROLS_Y_VAR = "--wg-chat-window-controls-y";
const TITLE_ROW_VAR = "--sumi-header-h";
const CONTROL_VAR = "--sumi-h-sm";

export function useAlignsWithWindowControls(): RefObject<HTMLDivElement | null> {
	const corner = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const element = corner.current;
		const chat = element?.parentElement;

		if (element === null || element === undefined || chat === null || chat === undefined) {
			return undefined;
		}

		const align = (): void => {
			const { left, top } = chat.getBoundingClientRect();
			element.style.setProperty(WINDOW_CONTROLS_X_VAR, `${Math.max(0, WINDOW_CONTROLS_X_PX - left)}px`);
			element.style.setProperty(WINDOW_CONTROLS_Y_VAR, `${Math.max(0, titleRowMiddleOf(element) - top)}px`);
		};
		const watcher = new ResizeObserver(align);
		watcher.observe(chat);
		window.addEventListener("resize", align);
		align();
		return () => {
			watcher.disconnect();
			window.removeEventListener("resize", align);
		};
	}, []);

	return corner;
}

function titleRowMiddleOf(element: HTMLElement): number {
	const looks = getComputedStyle(element);
	const row = Number.parseFloat(looks.getPropertyValue(TITLE_ROW_VAR));
	const control = Number.parseFloat(looks.getPropertyValue(CONTROL_VAR));
	return Number.isFinite(row) && Number.isFinite(control) ? (row - control) / 2 : 0;
}
