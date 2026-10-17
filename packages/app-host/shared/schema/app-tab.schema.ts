import { z } from "zod";

export const AppTabSchema = z.object({
	id: z.string(),
	label: z.string(),
	icon: z.string(),
});

export type AppTab = z.infer<typeof AppTabSchema>;

export const AppTabStateSchema = AppTabSchema.extend({ isShown: z.boolean() });

export const AppTabsSchema = z.object({
	tabs: z.array(AppTabStateSchema).readonly(),
	preview: AppTabSchema.nullable(),
});

export type AppTabs = z.infer<typeof AppTabsSchema>;
