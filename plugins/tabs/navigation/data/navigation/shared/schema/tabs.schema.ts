import { z } from "zod";
import { KeptSplitSchema } from "./splits.schema.js";
import { OpenWindowSchema } from "./windows.schema.js";

export const AppKindSchema = z.string().regex(/^[a-z][a-z0-9-]*$/, "an app id is lowercase letters, digits and dashes");

export type AppKind = z.infer<typeof AppKindSchema>;

export const PageAppSchema = AppKindSchema;

export type PageApp = z.infer<typeof PageAppSchema>;

export const StudioViewSchema = z.union([z.literal("app"), PageAppSchema]);

export type StudioView = z.infer<typeof StudioViewSchema>;

export const TabMarkSchema = z.enum(["none", "running", "asking", "failed", "unread"]);

export type TabMark = z.infer<typeof TabMarkSchema>;

export const SectionListSchema = z.enum(["workspace"]);

export type SectionList = z.infer<typeof SectionListSchema>;

export const GroupHueSchema = z.enum(["red", "orange", "amber", "green", "teal", "blue", "purple", "pink"]);

export type GroupHue = z.infer<typeof GroupHueSchema>;

export const ListEntrySchema = z.object({
	kind: z.enum(["tab", "group"]),
	id: z.string(),
});

export type ListEntry = z.infer<typeof ListEntrySchema>;

export const KeptGroupSchema = z.object({
	id: z.string(),
	name: z.string(),
	hue: GroupHueSchema.nullable(),
	isOpen: z.boolean(),
	entries: z.array(ListEntrySchema),
});

export const TabHistorySchema = z.object({
	back: z.array(z.string()),
	forward: z.array(z.string()),
});

export type TabHistory = z.infer<typeof TabHistorySchema>;

export const AskedLinkSchema = z.object({
	id: z.string(),
	from: z.string(),
	href: z.string(),
	inNewTab: z.boolean(),
});

export type AskedLink = z.infer<typeof AskedLinkSchema>;

export const KeptTabSchema = z.object({
	id: z.string(),
	app: AppKindSchema,
	history: TabHistorySchema.optional(),
	pageId: z.string().nullable(),
	label: z.string().nullable(),
	lastAddress: z.string().nullable().default(null),
	title: z.string().nullable().default(null),
	mark: TabMarkSchema.default("none"),
	isFolded: z.boolean().optional(),
});

export const ClosedTabSchema = z.object({
	tab: KeptTabSchema,
	chatId: z.string().nullable().default(null),
	groupId: z.string().nullable().default(null),
	at: z.number(),
	address: z.string(),
});

export const WindowViewSchema = z.object({
	shownId: z.string().nullable(),
	shownSplitId: z.string().nullable().default(null),
	view: StudioViewSchema.default("app"),
	selectedId: z.string().nullable().default(null),
	sessionId: z.string().nullable().default(null),
	panes: z.unknown().optional(),
	leftHidden: z.boolean().optional().catch(undefined),
});

export type WindowView = z.infer<typeof WindowViewSchema>;

export const WindowSessionSchema = z.object({
	id: z.string().min(1),
	window: z.string().min(1),
	closedAt: z.number().int().nonnegative(),
	tabs: z.array(KeptTabSchema),
	lists: z.record(z.string(), z.array(ListEntrySchema)),
	groups: z.array(KeptGroupSchema),
	splits: z.array(KeptSplitSchema),
	view: WindowViewSchema.nullable(),
});

export type WindowSession = z.infer<typeof WindowSessionSchema>;

export const PlacedTabsSchema = z.object({
	tabs: z.array(KeptTabSchema),
	lists: z.record(z.string(), z.array(ListEntrySchema)),
	groups: z.array(KeptGroupSchema).default([]),
	views: z.record(z.string(), WindowViewSchema).default({}),
	sessions: z.array(WindowSessionSchema).default([]),
	minted: z.number().int().nonnegative(),
	closed: z.array(ClosedTabSchema),
	splits: z.array(KeptSplitSchema).default([]),
	mintedSplits: z.number().int().nonnegative().default(0),
	askedLinks: z.array(AskedLinkSchema).optional(),
	mintedLinks: z.number().int().nonnegative().optional(),
	windows: z.array(OpenWindowSchema).default([]),
});

export type PlacedTabs = z.infer<typeof PlacedTabsSchema>;

export const WindowTabsSchema = z.object({
	tabs: z.array(KeptTabSchema),
	lists: z.record(z.string(), z.array(ListEntrySchema)),
	groups: z.array(KeptGroupSchema),
	shownId: z.string().nullable(),
	minted: z.number().int().nonnegative(),
	closed: z.array(ClosedTabSchema),
});

export type WindowTabs = z.infer<typeof WindowTabsSchema>;
