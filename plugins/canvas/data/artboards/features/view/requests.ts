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
	.handle(({ tabId }, { canvases }) => {
		const canvas = canvases.canvas(tabId);
		const reason = `pages and layers ${shownWord(canvas.isPanelOpen)} → ${shownWord(!canvas.isPanelOpen)}`;
		canvases.saveCanvas(tabId, { ...canvas, isPanelOpen: !canvas.isPanelOpen }, reason);
		console.info(`[artboards] ${tabId}: ${reason}`);
	});

export const resizePanel = command()
	.public()
	.input(ResizePanelAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId, width }, { canvases }) => {
		const canvas = canvases.canvas(tabId);
		const panelWidth = Math.round(Math.min(PANEL_MOST_PX, Math.max(PANEL_LEAST_PX, width)));
		const reason = `pages and layers width ${canvas.panelWidth} → ${panelWidth}px`;
		canvases.saveCanvas(tabId, { ...canvas, panelWidth }, reason);
		console.info(`[artboards] ${tabId}: ${reason}`);
	});

export const setBackground = command()
	.public()
	.input(SetBackgroundAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId, background }, { canvases }) => {
		const canvas = canvases.canvas(tabId);
		const reason = `background ${backgroundWord(canvas.background)} → ${backgroundWord(background)}`;
		canvases.saveCanvas(tabId, { ...canvas, background }, reason);
		console.info(`[artboards] ${tabId}: ${reason}`);
	});

export const keepCamera = command()
	.public()
	.input(KeepCameraAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId, camera }, { canvases }) => {
		const canvas = canvases.canvas(tabId);
		canvases.saveCanvas(tabId, { ...canvas, camera }, `camera kept at ${Math.round(camera.scale * 100)}%`);
	});

const PANEL_LEAST_PX = 200;
const PANEL_MOST_PX = 480;

function backgroundWord(background: string | null): string {
	return background ?? "theme";
}

function shownWord(isShown: boolean): string {
	return isShown ? "shown" : "hidden";
}
