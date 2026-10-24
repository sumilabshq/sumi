import { z } from "zod";

export const FrameEdgeSchema = z.enum(["left", "chat"]);

export type FrameEdge = z.infer<typeof FrameEdgeSchema>;

export const FrameWidthsSchema = z.object({
	left: z.number(),
	chat: z.number(),
});

export type FrameWidths = z.infer<typeof FrameWidthsSchema>;

export const WidthPxSchema = z.number().finite().positive();
