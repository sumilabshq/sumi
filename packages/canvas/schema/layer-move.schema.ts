import { z } from "zod";

export const LayerMoveSchema = z.object({
	file: z.string(),
	sourceKey: z.string(),
	from: z.number(),
	into: z.number(),
	before: z.number().nullable(),
});

export type LayerMove = z.output<typeof LayerMoveSchema>;
