import { z } from "zod";

export const AppActionSchema = z.object({
	id: z
		.string()
		.max(40)
		.regex(/^[a-z][a-z0-9-]*$/),
	label: z.string().min(1).max(60),
	icon: z
		.string()
		.max(40)
		.regex(/^[a-z][a-z0-9-]*$/),
	isOff: z.boolean().optional(),
	isBusy: z.boolean().optional(),
});

export type AppAction = z.infer<typeof AppActionSchema>;

export const PressSchema = z.object({
	id: z.string(),
	action: z.string(),
});

export type Press = z.infer<typeof PressSchema>;

export const AppPageAskSchema = z.object({
	id: z.string().min(1),
});

export const AppPageSchema = z.object({
	title: z.string().nullable(),
	favicon: z.string().nullable(),
	actions: z.array(AppActionSchema),
	presses: z.array(PressSchema),
});

export type AppPage = z.infer<typeof AppPageSchema>;

export const PageFaviconSchema = z.union([
	z
		.string()
		.max(65_536)
		.regex(/^data:image\//),
	z
		.string()
		.max(2048)
		.regex(/^sumi-app:\/\/[a-z][a-z0-9-]*\//),
]);

export const RecordedAppPageSchema = z.object({
	id: z.string().min(1),
	title: z.string().max(200).optional(),
	favicon: PageFaviconSchema.optional(),
	actions: z.array(AppActionSchema).max(6).optional(),
});

export const PageTabSchema = z.object({
	id: z.string().min(1),
	app: z.string().min(1),
	address: z.string().nullable(),
});

export type PageTab = z.infer<typeof PageTabSchema>;

export const PageTitlesAskSchema = z.object({
	tabs: z.array(PageTabSchema),
});

export const PageTitleSchema = z.object({
	id: z.string(),
	title: z.string().nullable(),
	favicon: z.string().nullable(),
	appTitle: z.string().nullable(),
});

export type PageTitle = z.infer<typeof PageTitleSchema>;

export const PageTitlesSchema = z.object({
	pages: z.array(PageTitleSchema),
});

export type RecordedAppPage = z.infer<typeof RecordedAppPageSchema>;

export const PressAppActionSchema = z.object({
	tab: z.string().min(1),
	action: z.string().min(1),
});

export const TakeActionPressSchema = z.object({
	id: z.string().min(1),
	press: z.string().min(1),
});

export const TakenPressSchema = z.object({
	id: z.string(),
	action: z.string(),
});

export const RememberedPageTitleSchema = z.object({
	tabId: z.string().min(1),
	url: z.string().max(8192),
	title: z.string().max(4096),
	favicon: z.string().max(65_536).nullable(),
});

export type RememberedPageTitle = z.infer<typeof RememberedPageTitleSchema>;

export const RememberedPageTitlesSchema = z.object({
	pages: z.array(RememberedPageTitleSchema).max(200),
});
