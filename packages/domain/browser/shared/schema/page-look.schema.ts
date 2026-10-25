import { z } from "zod";

export const PageLookSchema = z.object({
	fill: z.string(),
});

export type PageLook = z.infer<typeof PageLookSchema>;

export const PageHeadSchema = z.object({
	tabId: z.string(),
	site: z.string(),
	title: z.string().nullable(),
	canGoBack: z.boolean(),
	canGoForward: z.boolean(),
	look: PageLookSchema.nullable(),
});

export type PageHead = z.infer<typeof PageHeadSchema>;
