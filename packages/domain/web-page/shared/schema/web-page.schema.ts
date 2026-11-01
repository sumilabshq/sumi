import { z } from "zod";

const PAGE_AREA_MAX_PX = 16_384;

const PagePxSchema = z.number().min(0).max(PAGE_AREA_MAX_PX);

export const WebPageTabSchema = z.object({
	tab: z.string().min(1).max(200),
});

export const OpenWebPageInputSchema = z.object({
	tab: z.string().min(1).max(200),
	url: z.string().trim().min(1).max(2048),
});

export const PageAreaSchema = z.object({
	x: PagePxSchema,
	y: PagePxSchema,
	width: PagePxSchema,
	height: PagePxSchema,
});

export type PageArea = z.infer<typeof PageAreaSchema>;

export const PlaceWebPageInputSchema = z.object({
	tab: z.string().min(1).max(200),
	area: PageAreaSchema.nullable(),
});

export const WebPageSchema = z.object({
	url: z.string(),
	title: z.string(),
	isLoading: z.boolean(),
	canGoBack: z.boolean(),
	canGoForward: z.boolean(),
});

export type WebPage = z.infer<typeof WebPageSchema>;
