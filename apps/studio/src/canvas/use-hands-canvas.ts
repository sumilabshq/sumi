import { useEffect } from "react";
import { ShowPageCommand } from "@widgetarium/canvas";
import type { App } from "@widgetarium/core/mediator";

export interface CanvasHandle {
	readonly showPage: (page: string) => void;
}

export function useHandsCanvas(canvasApp: App, onCanvas: ((canvas: CanvasHandle) => void) | undefined): void {
	useEffect(
		() => onCanvas?.({ showPage: (page) => void canvasApp.send(ShowPageCommand, { page }) }),
		[canvasApp, onCanvas],
	);
}
