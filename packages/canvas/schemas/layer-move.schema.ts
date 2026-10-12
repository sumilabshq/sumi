import { z } from "zod";

export const LayerMoveSchema = z.object({
	file: z.string(),
	sourceKey: z.string(),
	from: z.number(),
	into: z.number(),
	before: z.number().nullable(),
});

export const LayerDropSchema = z.object({
	widget: z.string(),
	dragged: z.string(),
	parent: z.string(),
	before: z.string().nullable(),
});

export type LayerMove = z.output<typeof LayerMoveSchema>;
export type LayerDrop = z.output<typeof LayerDropSchema>;
