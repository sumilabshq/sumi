import { z } from "zod";
import { AppKindSchema } from "./app-tab.schema.js";
import { KeptGroupSchema, ListEntrySchema } from "./tab-group.schema.js";

export const KeptTabSchema = z.object({
	id: z.string(),
	app: AppKindSchema,
	pageId: z.string().nullable(),
	label: z.string().nullable(),
	essentialId: z.string().nullable().default(null),
	lastAddress: z.string().nullable().default(null),
	lastTitle: z.string().nullable().default(null),
	lastFavicon: z.string().nullable().default(null),
});

export const KeptTabsSchema = z.object({
	tabs: z.array(KeptTabSchema),
	lists: z.record(z.string(), z.array(ListEntrySchema)).nullable().default(null),
	groups: z.array(KeptGroupSchema).default([]),
	shownId: z.string().nullable(),
	lastShown: z.record(z.string(), z.string()).default({}),
	minted: z.number().int().nonnegative(),
	closed: z.array(
		z.object({
			tab: KeptTabSchema,
			chatId: z.string().nullable().default(null),
			groupId: z.string().nullable().default(null),
			at: z.number(),
			address: z.string(),
		}),
	),
});

export type KeptTabs = z.infer<typeof KeptTabsSchema>;
