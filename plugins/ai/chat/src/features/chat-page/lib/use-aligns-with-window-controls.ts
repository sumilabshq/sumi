import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

// TRADE-OFF: copies trafficLightPosition.x of apps/tauri/src-tauri/tauri.conf.json; the window reports no position
const WINDOW_CONTROLS_X_PX = 16;

export function useAlignsWithWindowControls(): RefObject<HTMLDivElement | null> {
	const corner = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const element = corner.current;
		const chat = element?.parentElement;

		if (element === null || element === undefined || chat === null || chat === undefined) {
			return undefined;
		}

		const align = (): void => {
			element.style.insetInlineStart = `${Math.max(0, WINDOW_CONTROLS_X_PX - chat.getBoundingClientRect().left)}px`;
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
