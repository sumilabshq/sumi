import { z } from "zod";
import { GroupHueSchema, WorkspaceListSchema } from "./tab-group.schema.js";

export const AppKindSchema = z.enum(["canvas", "browser"]);

export type AppKind = z.infer<typeof AppKindSchema>;

export const OpenedTabSchema = z.object({ id: z.string() });

export const TabStatusSchema = z.enum(["reading", "waiting", "cannot-look"]);

export type TabStatus = z.infer<typeof TabStatusSchema>;

export const TabArtSchema = z.enum([
	"canvas",
	"browser",
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
	app: AppKindSchema,
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

export const ListOwnerSchema = z.enum(["workspace", "chat"]);

export type ListOwner = z.infer<typeof ListOwnerSchema>;

export const ListTargetSchema = z.object({
	list: z.string(),
	owner: ListOwnerSchema,
	title: z.string(),
});

export type ListTarget = z.infer<typeof ListTargetSchema>;

export const TabSectionSchema = ListTargetSchema.extend({
	isOpen: z.boolean(),
	count: z.number().int().nonnegative(),
	entries: z.array(SidebarEntrySchema).readonly(),
});

export type TabSection = z.infer<typeof TabSectionSchema>;

export const TabsSidebarSchema = z.object({
	chat: z.object({
		id: z.string(),
		title: z.string(),
	}),
	essentials: z.array(EssentialTileSchema).readonly(),
	sections: z.array(TabSectionSchema).readonly(),
	listTargets: z.array(ListTargetSchema).readonly(),
	workspaceList: WorkspaceListSchema,
});

export type TabsSidebar = z.infer<typeof TabsSidebarSchema>;

export const HeldTabSchema = z.object({
	id: z.string(),
	app: AppKindSchema,
	label: z.string().nullable(),
	pageId: z.string().nullable(),
});

export type HeldTab = z.infer<typeof HeldTabSchema>;

export const HeldTabsSchema = z.object({
	tabs: z.array(HeldTabSchema).readonly(),
	shownTabId: z.string().nullable(),
});

export type HeldTabs = z.infer<typeof HeldTabsSchema>;
