import { z } from "zod";

export const TabDropSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("list"),
		list: z.string(),
		groupId: z.string().nullable(),
		before: z.string().nullable(),
	}),
	z.object({
		kind: z.literal("split"),
		splitId: z.string(),
		before: z.string().nullable(),
	}),
	z.object({ kind: z.literal("own-window") }),
]);

export type TabDrop = z.infer<typeof TabDropSchema>;
