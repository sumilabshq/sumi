import { z } from "zod";

export const CanvasFieldSchema = z.enum([
	"app",
	"page",
	"keptPage",
	"isLayersOpen",
	"mode",
	"camera",
	"selection",
	"variants",
	"focusedWidget",
	"isLayoutLocked",
	"closedLayers",
	"seenLayers",
]);

export const MomentFieldsSchema = z.object({ fields: z.array(CanvasFieldSchema).readonly() });

export type CanvasField = z.output<typeof CanvasFieldSchema>;
