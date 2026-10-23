import { z } from "zod";

export const TabDropSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("list"),
		list: z.string(),
		groupId: z.string().nullable(),
		before: z.string().nullable(),
	}),
	z.object({ kind: z.literal("window") }),
	z.object({
		kind: z.literal("essentials"),
		at: z.number().int().nonnegative(),
	}),
]);

export type TabDrop = z.infer<typeof TabDropSchema>;
