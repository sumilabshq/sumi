import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import {
	CanvasAskSchema,
	KeepCameraAskSchema,
	ResizePanelAskSchema,
	SetBackgroundAskSchema,
} from "../../shared/schema/asks.schema.js";

export const togglePanel = command()
	.public()
	.input(CanvasAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ canvasId }, { canvases }) => {
		const canvas = canvases.canvas(canvasId);
		const reason = `pages and layers ${shownWord(canvas.isPanelOpen)} → ${shownWord(!canvas.isPanelOpen)}`;
		canvases.saveCanvas(canvasId, { ...canvas, isPanelOpen: !canvas.isPanelOpen }, reason);
		console.info(`[artboards] ${canvasId}: ${reason}`);
	});

export const resizePanel = command()
	.public()
	.input(ResizePanelAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ canvasId, width }, { canvases }) => {
		const canvas = canvases.canvas(canvasId);
		const panelWidth = Math.round(Math.min(PANEL_MOST_PX, Math.max(PANEL_LEAST_PX, width)));
		const reason = `pages and layers width ${canvas.panelWidth} → ${panelWidth}px`;
		canvases.saveCanvas(canvasId, { ...canvas, panelWidth }, reason);
		console.info(`[artboards] ${canvasId}: ${reason}`);
	});

export const setBackground = command()
	.public()
	.input(SetBackgroundAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ canvasId, background }, { canvases }) => {
		const canvas = canvases.canvas(canvasId);
		const reason = `background ${backgroundWord(canvas.background)} → ${backgroundWord(background)}`;
		canvases.saveCanvas(canvasId, { ...canvas, background }, reason);
		console.info(`[artboards] ${canvasId}: ${reason}`);
	});

export const keepCamera = command()
	.public()
	.input(KeepCameraAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ canvasId, camera }, { canvases }) => {
		const canvas = canvases.canvas(canvasId);
		canvases.saveCanvas(canvasId, { ...canvas, camera }, `camera kept at ${Math.round(camera.scale * 100)}%`);
	});

const PANEL_LEAST_PX = 200;
const PANEL_MOST_PX = 480;

function backgroundWord(background: string | null): string {
	return background ?? "theme";
}

function shownWord(isShown: boolean): string {
	return isShown ? "shown" : "hidden";
}
