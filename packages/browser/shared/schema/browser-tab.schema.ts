import { z } from "zod";
import { AccessDecisionSchema, ReadKindSchema } from "./site-access.schema.js";

export const BrowserTabSchema = z.object({
	id: z.string(),
	url: z.string(),
	title: z.string(),
	favicon: z.string().nullable(),
	isLoading: z.boolean(),
	canGoBack: z.boolean(),
	canGoForward: z.boolean(),
});

export type BrowserTab = z.infer<typeof BrowserTabSchema>;

export const InkReadingSchema = z.object({
	tabId: z.string(),
	kind: ReadKindSchema,
});

export type InkReading = z.infer<typeof InkReadingSchema>;

export const BrowserTabStateSchema = BrowserTabSchema.extend({
	isShown: z.boolean(),
	access: AccessDecisionSchema.nullable(),
});

export type BrowserTabState = z.infer<typeof BrowserTabStateSchema>;

export const BrowserTabsSchema = z.object({
	isAvailable: z.boolean(),
	tabs: z.array(BrowserTabStateSchema).readonly(),
	inkReading: InkReadingSchema.nullable(),
});

export type BrowserTabs = z.infer<typeof BrowserTabsSchema>;
