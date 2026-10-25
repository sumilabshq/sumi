import { z } from "zod";

export const GhostPageSchema = z.object({
	htmlClass: z.string(),
	htmlAttributes: z.array(z.tuple([z.string(), z.string()])),
	bodyClass: z.string(),
	ghost: z.string(),
});

export const GhostLaySchema = z.object({
	page: GhostPageSchema,
	width: z.number().positive(),
	height: z.number().positive(),
	anchorX: z.number(),
	anchorY: z.number(),
});

export type GhostLay = z.infer<typeof GhostLaySchema>;

export const GhostWornSchema = z.object({
	styles: z.record(z.string(), z.string()),
	texts: z.record(z.string(), z.string()),
});

export type GhostWorn = z.infer<typeof GhostWornSchema>;

export const GhostShownSchema = z.object({
	shown: z.boolean(),
});
