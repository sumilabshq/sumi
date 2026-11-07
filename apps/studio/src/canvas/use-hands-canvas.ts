import { useContext, useEffect } from "react";
import { ShowPageCommand } from "@widgetarium/canvas";
import { REFUSAL_HANDLER } from "@widgetarium/data-framework/command-refusals";
import type { RefusalHandler, Runtime } from "@widgetarium/data-framework";

export interface CanvasHandle {
	readonly showPage: (page: string) => void;
}

export function useHandsCanvas(canvasApp: Runtime, onCanvas: ((canvas: CanvasHandle) => void) | undefined): void {
	const onRefused = useContext(REFUSAL_HANDLER);
	useEffect(
		() => onCanvas?.({ showPage: (page) => void pageShown(canvasApp, page, onRefused) }),
		[canvasApp, onCanvas, onRefused],
	);
}

async function pageShown(canvasApp: Runtime, page: string, onRefused: RefusalHandler): Promise<void> {
	const answer = await canvasApp.send(ShowPageCommand, { page });
	if (!answer.ok) onRefused({ name: ShowPageCommand.name, reason: answer.reason, ran: answer.ran });
}
