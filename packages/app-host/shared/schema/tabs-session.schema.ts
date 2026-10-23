import { z } from "zod";
import { AppKindSchema } from "./app-tab.schema.js";

export const KeptTabSchema = z.object({
	id: z.string(),
	app: AppKindSchema,
	pageId: z.string().nullable(),
	isPinned: z.boolean(),
	label: z.string().nullable(),
});

export const KeptTabsSchema = z.object({
	tabs: z.array(KeptTabSchema),
	shownId: z.string().nullable(),
	minted: z.number().int().nonnegative(),
	closed: z.array(
		z.object({
			tab: KeptTabSchema,
			at: z.number(),
			address: z.string(),
		}),
	),
});

export type KeptTabs = z.infer<typeof KeptTabsSchema>;
