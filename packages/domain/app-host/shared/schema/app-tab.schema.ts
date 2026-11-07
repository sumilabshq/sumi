import { z } from "zod";
import { ChatMarkSchema } from "./chat-list.schema.js";
import { GroupHueSchema, SectionListSchema } from "./tab-group.schema.js";

export const AppKindSchema = z.string().regex(/^(?!chat$)[a-z][a-z0-9-]*$/, "a page app is any app but the chat");

export type AppKind = z.infer<typeof AppKindSchema>;

export const TabToOpenSchema = z.object({
	app: AppKindSchema,
	list: z.string().nullable().default(null),
	groupId: z.string().nullable().default(null),
	address: z.string().default(""),
	show: z.boolean().default(true),
	reusesHeld: z.boolean().default(false),
});

export type TabToOpen = z.infer<typeof TabToOpenSchema>;

export const TabAppSchema = z.string().regex(/^[a-z][a-z0-9-]*$/, "an app id is lowercase letters, digits and dashes");

export type TabApp = z.infer<typeof TabAppSchema>;

export const OpenedTabSchema = z.object({ id: z.string() });

export const TabStatusSchema = z.enum(["reading", "waiting", "cannot-look"]);

export type TabStatus = z.infer<typeof TabStatusSchema>;

export const TabArtSchema = z.enum([
	"canvas",
	"browser",
	"tasks",
	"git",
	"files",
	"routines",
	"settings",
	"note",
	"table",
	"code-ts",
	"code-js",
	"code-py",
	"code-css",
	"image",
	"built-app",
	"site",
	"chat",
]);

export type TabArt = z.infer<typeof TabArtSchema>;

export const AppTabSchema = z.object({
	id: z.string(),
	app: TabAppSchema,
	title: z.string(),
	subtitle: z.string().nullable(),
	icon: TabArtSchema,
	favicon: z.string().nullable(),
	status: TabStatusSchema.nullable(),
	label: z.string().nullable(),
	address: z.string().nullable(),
	isInOwnWindow: z.boolean(),
	mark: ChatMarkSchema,
});

export type AppTab = z.infer<typeof AppTabSchema>;

export const AppTabStateSchema = AppTabSchema.extend({ isShown: z.boolean() });

export type AppTabState = z.infer<typeof AppTabStateSchema>;

export const AppTabsSchema = z.object({
	tabs: z.array(AppTabStateSchema).readonly(),
	canReopen: z.boolean(),
});

export const EssentialTileSchema = z.object({
	id: z.string(),
	title: z.string(),
	icon: TabArtSchema,
	favicon: z.string().nullable(),
	isShown: z.boolean(),
	isLive: z.boolean(),
});

export type EssentialTile = z.infer<typeof EssentialTileSchema>;

export const GroupStateSchema = z.object({
	id: z.string(),
	name: z.string(),
	hue: GroupHueSchema.nullable(),
	isOpen: z.boolean(),
	tabs: z.array(AppTabStateSchema).readonly(),
});

export type GroupState = z.infer<typeof GroupStateSchema>;

export const SplitMapSchema = z.object({
	cells: z
		.array(
			z.object({
				tabId: z.string(),
				x: z.number(),
				y: z.number(),
				w: z.number(),
				h: z.number(),
			}),
		)
		.readonly(),
	markedId: z.string(),
});

export type SplitMap = z.infer<typeof SplitMapSchema>;

export const SplitMarkSchema = z.object({
	id: z.string(),
	map: SplitMapSchema,
});

export type SplitMark = z.infer<typeof SplitMarkSchema>;

export const ChildTabSchema = z.object({
	kind: z.literal("tab"),
	tab: AppTabStateSchema,
});

export const ChildGroupSchema = z.object({
	kind: z.literal("group"),
	group: GroupStateSchema,
});

export const TabChildSchema = z.discriminatedUnion("kind", [ChildTabSchema, ChildGroupSchema]);

export type TabChild = z.infer<typeof TabChildSchema>;

export const SidebarTabSchema = z.object({
	kind: z.literal("tab"),
	tab: AppTabStateSchema,
	splitMark: SplitMarkSchema.nullable().optional(),
	children: z.array(TabChildSchema).readonly().optional(),
	isFolded: z.boolean().optional(),
});

export type SidebarTab = z.infer<typeof SidebarTabSchema>;

export const SidebarGroupStateSchema = z.object({
	id: z.string(),
	name: z.string(),
	hue: GroupHueSchema.nullable(),
	isOpen: z.boolean(),
	items: z.array(SidebarTabSchema).readonly(),
});

export type SidebarGroupState = z.infer<typeof SidebarGroupStateSchema>;

export const SidebarGroupSchema = z.object({
	kind: z.literal("group"),
	group: SidebarGroupStateSchema,
});

export const SplitMemberSchema = z.object({
	item: SidebarTabSchema,
	isPinned: z.boolean(),
	isFocused: z.boolean(),
});

export type SplitMember = z.infer<typeof SplitMemberSchema>;

export const SidebarSplitStateSchema = z.object({
	id: z.string(),
	isShown: z.boolean(),
	map: SplitMapSchema,
	members: z.array(SplitMemberSchema).readonly(),
});

export type SidebarSplitState = z.infer<typeof SidebarSplitStateSchema>;

export const SidebarSplitSchema = z.object({
	kind: z.literal("split"),
	split: SidebarSplitStateSchema,
});

export const SidebarEntrySchema = z.discriminatedUnion("kind", [
	SidebarTabSchema,
	SidebarGroupSchema,
	SidebarSplitSchema,
]);

export type SidebarEntry = z.infer<typeof SidebarEntrySchema>;

export const SidebarSectionSchema = z.object({
	list: SectionListSchema,
	title: z.string(),
	entries: z.array(SidebarEntrySchema).readonly(),
});

export type SidebarSection = z.infer<typeof SidebarSectionSchema>;

export const TabsSidebarSchema = z.object({
	essentials: z.array(EssentialTileSchema).readonly(),
	sections: z.array(SidebarSectionSchema).readonly(),
	newTabList: z.string(),
});

export type TabsSidebar = z.infer<typeof TabsSidebarSchema>;

export const HeldTabSchema = z.object({
	id: z.string(),
	app: AppKindSchema,
	label: z.string().nullable(),
	pageId: z.string().nullable(),
	address: z.string().nullable(),
});

export type HeldTab = z.infer<typeof HeldTabSchema>;

export const HeldTabsSchema = z.object({
	tabs: z.array(HeldTabSchema).readonly(),
	shownTabId: z.string().nullable(),
});

export type HeldTabs = z.infer<typeof HeldTabsSchema>;
