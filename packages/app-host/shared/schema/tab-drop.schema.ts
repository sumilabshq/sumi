import { z } from "zod";

export const TabDropSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("list"),
		groupId: z.string().nullable(),
		before: z.string().nullable(),
	}),
	z.object({
		kind: z.literal("essentials"),
		at: z.number().int().nonnegative(),
	}),
]);

export type TabDrop = z.infer<typeof TabDropSchema>;
