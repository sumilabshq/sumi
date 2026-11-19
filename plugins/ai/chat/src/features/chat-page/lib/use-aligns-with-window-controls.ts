import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

// TRADE-OFF: copies trafficLightPosition.x of apps/tauri/src-tauri/tauri.conf.json; the window reports no position
const WINDOW_CONTROLS_X_PX = 16;
const WINDOW_CONTROLS_X_VAR = "--wg-chat-window-controls-x";

export function useAlignsWithWindowControls(): RefObject<HTMLDivElement | null> {
	const chat = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const element = chat.current;

		if (element === null) {
			return undefined;
		}

		const align = (): void => {
			const { left } = element.getBoundingClientRect();
			element.style.setProperty(WINDOW_CONTROLS_X_VAR, `${Math.max(0, WINDOW_CONTROLS_X_PX - left)}px`);
		};
		const watcher = new ResizeObserver(align);
		watcher.observe(element);
		window.addEventListener("resize", align);
		align();
		return () => {
			watcher.disconnect();
			window.removeEventListener("resize", align);
		};
	}, []);

	return chat;
}
