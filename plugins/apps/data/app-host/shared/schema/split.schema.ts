import { z } from "zod";

export const SplitSideSchema = z.enum(["left", "right", "top", "bottom"]);

export const SplitPlacingSchema = z.object({
	tabId: z.string().min(1),
	targetTabId: z.string().min(1).nullable(),
	side: SplitSideSchema,
	isPaneMoved: z.boolean(),
});

export const ShownSplitSchema = z.object({
	shownId: z.string().nullable(),
	split: z
		.object({
			id: z.string(),
			memberIds: z.array(z.string()).readonly(),
			focusedId: z.string(),
		})
		.nullable(),
});

export type ShownSplit = z.infer<typeof ShownSplitSchema>;
