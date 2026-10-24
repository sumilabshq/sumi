import { z } from "zod";

export const CanvasModeSchema = z.enum(["pointer", "hand"]);

export const CanvasOpeningSchema = z.object({
	page: z.string(),
	isLayersOpen: z.boolean(),
	mode: CanvasModeSchema,
});

export const CanvasOpenedSchema = CanvasOpeningSchema.extend({ app: z.string() });

export const ModeAnswerSchema = z.object({ mode: CanvasModeSchema });

export type CanvasMode = z.output<typeof CanvasModeSchema>;
export type CanvasOpening = z.output<typeof CanvasOpeningSchema>;
export type CanvasOpened = z.output<typeof CanvasOpenedSchema>;
export type Variants = Readonly<Record<string, string>>;
