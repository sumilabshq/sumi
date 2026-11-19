import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { canvasesChanged } from "../../gateways/canvases/canvases.events.js";
import { createEmptyCanvas } from "../../shared/lib/canvas-edits.js";
import { canvasRowOf, canvasViewOf, canvasesPageOf } from "../../shared/lib/canvas-views.js";
import {
	CanvasAskSchema,
	CanvasesPageAskSchema,
	NoAskSchema,
	RenameCanvasAskSchema,
} from "../../shared/schema/asks.schema.js";
import { CanvasRowSchema, CanvasViewSchema, CanvasesPageSchema } from "../../shared/schema/canvas.schema.js";

export const getCanvas = query()
	.public()
	.input(CanvasAskSchema)
	.output(CanvasViewSchema)
	.handle(({ canvasId }, { canvases }) => canvasViewOf(canvasId, canvases.canvas(canvasId)));

export const getCanvases = query()
	.public()
	.input(NoAskSchema)
	.output(CanvasRowSchema.array())
	.handle((_input, { canvases }) =>
		Object.entries(canvases.canvases()).map(([canvasId, canvas]) => canvasRowOf(canvasId, canvas)),
	);

export const getCanvasesPage = query()
	.public()
	.input(CanvasesPageAskSchema)
	.output(CanvasesPageSchema)
	.handle((ask, { canvases }) => canvasesPageOf(canvases.canvases(), ask));

export const createCanvas = command()
	.public()
	.input(CanvasAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ canvasId }, { canvases }) => {
		if (canvases.canvases()[canvasId] !== undefined) {
			console.info(`[artboards] ${canvasId}: create skipped, the canvas exists`);
			return;
		}

		canvases.saveCanvas(canvasId, createEmptyCanvas(), "none → empty canvas");
		console.info(`[artboards] ${canvasId}: none → empty canvas`);
	});

export const renameCanvas = command()
	.public()
	.input(RenameCanvasAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ canvasId, title }, { canvases }) => {
		const canvas = canvases.canvas(canvasId);
		const reason = `title "${canvas.title}" → "${title}"`;
		canvases.saveCanvas(canvasId, { ...canvas, title }, reason);
		console.info(`[artboards] ${canvasId}: ${reason}`);
	});

export const rereadCanvases = subscriber(canvasesChanged).handle((_input, { invalidate }) => {
	invalidate(getCanvas);
	invalidate(getCanvases);
	invalidate(getCanvasesPage);
});
