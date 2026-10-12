import { IQuery, ISlot, inject, widget } from "@widgetarium/core";
import { FrameSizeSchema } from "../schemas/frame-size.schema.js";
import { CanvasOverlay } from "../ui/canvas-overlay/canvas-overlay.js";

export const canvasOverlayInject = inject({
	getViewport: IQuery.output(FrameSizeSchema.nullable().default(null)),
	field: ISlot,
	header: ISlot.array(),
	start: ISlot.array(),
	end: ISlot.array(),
	bottom: ISlot.array(),
});

export const CanvasOverlayWidget = widget().inject(canvasOverlayInject).render(CanvasOverlay);
