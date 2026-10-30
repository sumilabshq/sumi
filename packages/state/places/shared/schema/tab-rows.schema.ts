import { z } from "zod";
import { TabsAskSchema } from "./screen.schema.js";
import { GroupHueSchema, PageAppSchema } from "./tabs.schema.js";

export const TabStatusSchema = z.enum(["reading", "waiting", "cannot-look"]);

export type TabStatus = z.infer<typeof TabStatusSchema>;

export const TabArtSchema = z.enum([
	"canvas",
	"browser",
	"terminal",
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
]);

export type TabArt = z.infer<typeof TabArtSchema>;

export const AppTabSchema = z.object({
	id: z.string(),
	app: PageAppSchema,
	title: z.string(),
	subtitle: z.string().nullable(),
	icon: TabArtSchema,
	favicon: z.string().nullable(),
	status: TabStatusSchema.nullable(),
	label: z.string().nullable(),
	address: z.string().nullable(),
	isInOwnWindow: z.boolean(),
});

export type AppTab = z.infer<typeof AppTabSchema>;

export const AppTabStateSchema = AppTabSchema.extend({ isShown: z.boolean() });

export type AppTabState = z.infer<typeof AppTabStateSchema>;

export const AppTabsSchema = z.object({
	tabs: z.array(AppTabStateSchema).readonly(),
	canReopen: z.boolean(),
});

export const EssentialSchema = z.object({
	id: z.string(),
	app: PageAppSchema,
	address: z.string().nullable(),
	title: z.string(),
	favicon: z.string().nullable(),
});

export type Essential = z.infer<typeof EssentialSchema>;

export const EssentialFaceSchema = z.object({
	app: PageAppSchema,
	address: z.string().nullable(),
	title: z.string(),
	favicon: z.string().nullable(),
});

export type EssentialFace = z.infer<typeof EssentialFaceSchema>;

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

export const SidebarEntrySchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("tab"),
		tab: AppTabStateSchema,
	}),
	z.object({
		kind: z.literal("group"),
		group: GroupStateSchema,
	}),
]);

export type SidebarEntry = z.infer<typeof SidebarEntrySchema>;

export const ListTargetSchema = z.object({
	list: z.string(),
	owner: z.enum(["workspace", "chat"]),
	title: z.string(),
});

export type ListTarget = z.infer<typeof ListTargetSchema>;

export const TabSectionSchema = ListTargetSchema.extend({
	isOpen: z.boolean(),
	count: z.number().int().nonnegative(),
	entries: z.array(SidebarEntrySchema).readonly(),
});

export type TabSection = z.infer<typeof TabSectionSchema>;

export const SidebarLookSchema = z.object({
	hidesEmptyLists: z.boolean(),
	hidesOwnWindowTabs: z.boolean(),
});

export const PlacedSidebarSchema = z.object({
	essentials: z.array(EssentialTileSchema).readonly(),
	sections: z.array(TabSectionSchema).readonly(),
	listTargets: z.array(ListTargetSchema).readonly(),
	workspaceList: z.literal("workspace"),
	newTabList: z.string(),
	view: SidebarLookSchema,
});

export type PlacedSidebar = z.infer<typeof PlacedSidebarSchema>;

export const SidebarAskSchema = z.object({
	at: TabsAskSchema,
	essentials: z.array(EssentialSchema),
	boardChats: z.array(z.object({ id: z.string(), title: z.string() })),
	shutLists: z.array(z.string()),
	look: SidebarLookSchema,
});

export type SidebarAsk = z.infer<typeof SidebarAskSchema>;

export const HeldTabSchema = z.object({
	id: z.string(),
	app: PageAppSchema,
	label: z.string().nullable(),
	pageId: z.string().nullable(),
});

export type HeldTab = z.infer<typeof HeldTabSchema>;

export const HeldTabsSchema = z.object({
	tabs: z.array(HeldTabSchema).readonly(),
	shownTabId: z.string().nullable(),
});

export const ClosedTabRowSchema = z.object({
	tabId: z.string().min(1),
	title: z.string(),
	app: PageAppSchema,
	address: z.string(),
});

export type ClosedTabRow = z.infer<typeof ClosedTabRowSchema>;

export const ClosedTabsSchema = z.object({ tabs: z.array(ClosedTabRowSchema).readonly() });
