import { z } from "zod";

export const PageFactsSchema = z.object({
	pageId: z.string(),
	title: z.string(),
	url: z.string(),
	favicon: z.string().nullable(),
	isInkReading: z.boolean(),
	isAskWaiting: z.boolean(),
	isClosedToInk: z.boolean(),
	isInOwnWindow: z.boolean(),
});

export type PageFacts = z.infer<typeof PageFactsSchema>;
