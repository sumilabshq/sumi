import { IQuery, inject, widget } from "@widgetarium/core";
import { DrawingSchema } from "../schemas/drawing.schema.js";
import { ShotSchema } from "../schemas/shot.schema.js";
import { CanvasShot } from "../ui/canvas-shot/canvas-shot.js";

export const canvasShotInject = inject({
	getShot: IQuery.output(ShotSchema.nullable().default(null)),
	getDrawing: IQuery.output(DrawingSchema.nullable().default(null)),
});

export const CanvasShotWidget = widget().inject(canvasShotInject).render(CanvasShot);
