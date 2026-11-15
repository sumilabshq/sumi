import { query, subscriber } from "#module";
import { canvasesChanged } from "../../gateways/canvases/canvases.events.js";
import { canvasRowOf, canvasViewOf } from "../../shared/lib/canvas-views.js";
import { CanvasAskSchema, NoAskSchema } from "../../shared/schema/asks.schema.js";
import { CanvasRowSchema, CanvasViewSchema } from "../../shared/schema/canvas.schema.js";

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

export const rereadCanvases = subscriber(canvasesChanged).handle((_input, { invalidate }) => {
	invalidate(getCanvas);
	invalidate(getCanvases);
});
