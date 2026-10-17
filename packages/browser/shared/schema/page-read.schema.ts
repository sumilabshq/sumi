import { z } from "zod";

export const PageContentSchema = z.object({
	url: z.string(),
	title: z.string(),
	text: z.string(),
	html: z.string(),
});

export type PageContent = z.infer<typeof PageContentSchema>;

export const PageRegionSchema = z.object({
	x: z.number().int().min(0),
	y: z.number().int().min(0),
	width: z.number().int().min(1),
	height: z.number().int().min(1),
});

export type PageRegion = z.infer<typeof PageRegionSchema>;

export const PageShotSchema = z.object({
	url: z.string(),
	png: z.string(),
	width: z.number(),
	height: z.number(),
});

export type PageShot = z.infer<typeof PageShotSchema>;

export const OpenedPageSchema = z.object({
	tabId: z.string(),
	url: z.string(),
});

export type OpenedPage = z.infer<typeof OpenedPageSchema>;

export const CommittedPageSchema = z.object({
	url: z.string(),
	entry: z.number(),
});

export type CommittedPage = z.infer<typeof CommittedPageSchema>;
