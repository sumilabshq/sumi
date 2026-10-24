import { z } from "zod";

export const FrameEdgeSchema = z.enum(["left", "chat"]);

export type FrameEdge = z.infer<typeof FrameEdgeSchema>;

export const FrameWidthsSchema = z.object({
	left: z.number(),
	chat: z.number(),
});

export type FrameWidths = z.infer<typeof FrameWidthsSchema>;

export const WidthPxSchema = z.number().finite().positive();

export const EdgeBoundsSchema = z.object({
	leastPx: z.number(),
	usualPx: z.number(),
});

export type EdgeBounds = z.infer<typeof EdgeBoundsSchema>;

export const FrameBoundsSchema = z.object({
	left: EdgeBoundsSchema,
	chat: EdgeBoundsSchema,
	plateLeastPx: z.number(),
});

export type FrameBounds = z.infer<typeof FrameBoundsSchema>;

export const FrameWidthsAnswerSchema = FrameWidthsSchema.extend({ bounds: FrameBoundsSchema });

export type FrameWidthsAnswer = z.infer<typeof FrameWidthsAnswerSchema>;
