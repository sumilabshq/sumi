import { z } from "zod";

export const PageContentSchema = z.object({
	url: z.string(),
	title: z.string(),
	text: z.string(),
});

export type PageContent = z.infer<typeof PageContentSchema>;

export const PageContentReadSchema = PageContentSchema.extend({
	hasSecretField: z.boolean(),
});

export type PageContentRead = z.infer<typeof PageContentReadSchema>;

export const PageRegionSchema = z.object({
	x: z.number().int().min(0),
	y: z.number().int().min(0),
	width: z.number().int().min(1),
	height: z.number().int().min(1),
});

export type PageRegion = z.infer<typeof PageRegionSchema>;

export const PageLayoutSchema = z.object({
	page: z.object({
		width: z.number(),
		height: z.number(),
	}),
	viewport: z.object({
		x: z.number(),
		y: z.number(),
		width: z.number(),
		height: z.number(),
	}),
});

export type PageLayout = z.infer<typeof PageLayoutSchema>;

export const PageShotSchema = z.object({
	url: z.string(),
	png: z.string(),
	width: z.number(),
	height: z.number(),
	layout: PageLayoutSchema.nullable(),
});

export type PageShot = z.infer<typeof PageShotSchema>;

export const PageToReadSchema = z.object({ tabId: z.string().nullable().default(null) });

export const PageFormSchema = z.enum(["text", "dom"]);

export type PageForm = z.infer<typeof PageFormSchema>;

export const ReadPageSchema = PageToReadSchema.extend({ form: PageFormSchema.default("text") });

export const ShotAreaSchema = z.enum(["viewport", "page"]);

export const CapturePageSchema = PageToReadSchema.extend({
	region: PageRegionSchema.nullable(),
	area: ShotAreaSchema.default("viewport"),
});

export type ShotAsk = Pick<z.output<typeof CapturePageSchema>, "region" | "area">;

export const InkAddressSchema = z.object({ url: z.string() });

export const OpenedPageSchema = z.object({
	tabId: z.string(),
	url: z.string(),
});

export const CommittedPageSchema = z.object({
	url: z.string(),
	entry: z.number(),
});

export type CommittedPage = z.infer<typeof CommittedPageSchema>;
