import { z } from "zod";
import { KeptSplitSchema } from "./splits.schema.js";

export const PageAppSchema = z.enum(["canvas", "browser", "terminal", "tasks"]);

export type PageApp = z.infer<typeof PageAppSchema>;

export const AppKindSchema = z.enum(["canvas", "browser", "terminal", "tasks", "chat"]);

export type AppKind = z.infer<typeof AppKindSchema>;

export const TabMarkSchema = z.enum(["none", "running", "unread"]);

export type TabMark = z.infer<typeof TabMarkSchema>;

export const SectionListSchema = z.enum(["workspace", "pinned"]);

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
	tabIds: z.array(z.string()),
});

export const KeptTabSchema = z.object({
	id: z.string(),
	app: AppKindSchema,
	pageId: z.string().nullable(),
	label: z.string().nullable(),
	essentialId: z.string().nullable().default(null),
	lastAddress: z.string().nullable().default(null),
	lastTitle: z.string().nullable().default(null),
	lastFavicon: z.string().nullable().default(null),
	title: z.string().nullable().default(null),
	mark: TabMarkSchema.default("none"),
	isFolded: z.boolean().default(false),
});

export const HeldListSchema = z.object({
	tabs: z.array(KeptTabSchema),
	entries: z.array(ListEntrySchema),
	groups: z.array(KeptGroupSchema),
});

export type HeldList = z.infer<typeof HeldListSchema>;

export const ClosedTabSchema = z.object({
	tab: KeptTabSchema,
	chatId: z.string().nullable().default(null),
	groupId: z.string().nullable().default(null),
	at: z.number(),
	address: z.string(),
	held: HeldListSchema.nullable().default(null),
});

export const WindowViewSchema = z.object({
	shownId: z.string().nullable(),
	lastShown: z.record(z.string(), z.string()).default({}),
	shownSplitId: z.string().nullable().default(null),
});

export type WindowView = z.infer<typeof WindowViewSchema>;

export const PlacedTabsSchema = z.object({
	tabs: z.array(KeptTabSchema),
	lists: z.record(z.string(), z.array(ListEntrySchema)),
	groups: z.array(KeptGroupSchema).default([]),
	views: z.record(z.string(), WindowViewSchema).default({}),
	minted: z.number().int().nonnegative(),
	closed: z.array(ClosedTabSchema),
	splits: z.array(KeptSplitSchema).default([]),
	mintedSplits: z.number().int().nonnegative().default(0),
});

export type PlacedTabs = z.infer<typeof PlacedTabsSchema>;

export const WindowTabsSchema = z.object({
	tabs: z.array(KeptTabSchema),
	lists: z.record(z.string(), z.array(ListEntrySchema)),
	groups: z.array(KeptGroupSchema),
	shownId: z.string().nullable(),
	lastShown: z.record(z.string(), z.string()),
	minted: z.number().int().nonnegative(),
	closed: z.array(ClosedTabSchema),
});

export type WindowTabs = z.infer<typeof WindowTabsSchema>;

export const ChatTabRowSchema = z.object({
	id: z.string(),
	title: z.string(),
	mark: TabMarkSchema,
});

export const ChatTabsSchema = z.object({
	pinned: z.array(ChatTabRowSchema),
	open: z.array(ChatTabRowSchema),
});

export type ChatTabs = z.infer<typeof ChatTabsSchema>;
