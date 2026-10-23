import { z } from "zod";

export const AppKindSchema = z.enum(["canvas", "browser"]);

export type AppKind = z.infer<typeof AppKindSchema>;

export const TabStatusSchema = z.enum(["reading", "waiting", "cannot-look"]);

export type TabStatus = z.infer<typeof TabStatusSchema>;

export const AppTabSchema = z.object({
	id: z.string(),
	app: AppKindSchema,
	title: z.string(),
	subtitle: z.string().nullable(),
	icon: z.string(),
	favicon: z.string().nullable(),
	status: TabStatusSchema.nullable(),
	isPinned: z.boolean(),
	label: z.string().nullable(),
	address: z.string().nullable(),
});

export type AppTab = z.infer<typeof AppTabSchema>;

export const AppTabStateSchema = AppTabSchema.extend({ isShown: z.boolean() });

export type AppTabState = z.infer<typeof AppTabStateSchema>;

export const AppChoiceSchema = z.object({
	app: AppKindSchema,
	label: z.string(),
	icon: z.string(),
});

export type AppChoice = z.infer<typeof AppChoiceSchema>;

export const AppTabsSchema = z.object({
	tabs: z.array(AppTabStateSchema).readonly(),
	apps: z.array(AppChoiceSchema).readonly(),
	preview: AppTabSchema.nullable(),
	canReopen: z.boolean(),
});

export type AppTabs = z.infer<typeof AppTabsSchema>;
