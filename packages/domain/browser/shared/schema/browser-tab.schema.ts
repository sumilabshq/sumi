import { z } from "zod";
import { AccessDecisionSchema, ReadKindSchema } from "./site-access.schema.js";

export const LoadFailureKindSchema = z.enum(["not-found", "offline", "refused", "timed-out", "certificate"]);

export type LoadFailureKind = z.infer<typeof LoadFailureKindSchema>;

export const PageFailureKindSchema = z.enum([...LoadFailureKindSchema.options, "scheme"]);

export type PageFailureKind = z.infer<typeof PageFailureKindSchema>;

export const PageFailureSchema = z.object({
	kind: PageFailureKindSchema,
	address: z.string(),
	code: z.string(),
});

export type PageFailure = z.infer<typeof PageFailureSchema>;

export const RecentSiteSchema = z.object({
	host: z.string(),
	address: z.string(),
	favicon: z.string().nullable(),
});

export type RecentSite = z.infer<typeof RecentSiteSchema>;

export const BrowserTabSchema = z.object({
	id: z.string(),
	url: z.string(),
	title: z.string(),
	favicon: z.string().nullable(),
	isLoading: z.boolean(),
	canGoBack: z.boolean(),
	canGoForward: z.boolean(),
	failure: PageFailureSchema.nullable(),
	window: z.string().nullable(),
});

export type BrowserTab = z.infer<typeof BrowserTabSchema>;

export const InkReadingSchema = z.object({
	tabId: z.string(),
	kind: ReadKindSchema,
});

export type InkReading = z.infer<typeof InkReadingSchema>;

export const BrowserTabStateSchema = BrowserTabSchema.extend({
	isShown: z.boolean(),
	isInOwnWindow: z.boolean(),
	access: AccessDecisionSchema.nullable(),
	nearMatch: z.string().nullable(),
});

export type BrowserTabState = z.infer<typeof BrowserTabStateSchema>;

export const BrowserTabsSchema = z.object({
	isAvailable: z.boolean(),
	canOpenOwnWindow: z.boolean(),
	tabs: z.array(BrowserTabStateSchema).readonly(),
	inkReading: InkReadingSchema.nullable(),
	recentSites: z.array(RecentSiteSchema).readonly(),
});

export type BrowserTabs = z.infer<typeof BrowserTabsSchema>;

export const BrowserViewSchema = z.object({ heldTabId: z.string().nullable() });

export type BrowserView = z.infer<typeof BrowserViewSchema>;

export const TabIdSchema = z.object({ tabId: z.string() });

export const OpenAddressSchema = z.object({
	tabId: z.string(),
	address: z.string().trim().min(1),
	heldTabId: z.string().nullable(),
});

export const PagesHostSchema = z.object({
	host: z.unknown(),
	heldTabId: z.string().nullable(),
});
