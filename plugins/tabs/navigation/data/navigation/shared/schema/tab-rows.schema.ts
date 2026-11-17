import { z } from "zod";
import { TabsAskSchema } from "./screen.schema.js";
import { AppKindSchema, GroupHueSchema, PageAppSchema, SectionListSchema, TabMarkSchema } from "./tabs.schema.js";
import { SplitMapSchema, SplitMarkSchema } from "./splits.schema.js";

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
	app: AppKindSchema,
	title: z.string(),
	subtitle: z.string().nullable(),
	icon: TabArtSchema,
	favicon: z.string().nullable(),
	status: TabStatusSchema.nullable(),
	label: z.string().nullable(),
	address: z.string().nullable(),
	isInOwnWindow: z.boolean(),
	mark: TabMarkSchema,
});

export type AppTab = z.infer<typeof AppTabSchema>;

export const AppTabStateSchema = AppTabSchema.extend({
	isShown: z.boolean(),
});

export type AppTabState = z.infer<typeof AppTabStateSchema>;

export const AppTabsSchema = z.object({
	tabs: z.array(AppTabStateSchema).readonly(),
	canReopen: z.boolean(),
});

export const SidebarTabSchema = z.object({
	kind: z.literal("tab"),
	tab: AppTabStateSchema,
	splitMark: SplitMarkSchema.nullable().optional(),
});

export type SidebarTab = z.infer<typeof SidebarTabSchema>;

export const SidebarGroupSchema = z.object({
	kind: z.literal("group"),
	group: z.object({
		id: z.string(),
		name: z.string(),
		hue: GroupHueSchema.nullable(),
		isOpen: z.boolean(),
		items: z.array(SidebarTabSchema).readonly(),
	}),
});

export type SidebarGroup = z.infer<typeof SidebarGroupSchema>;

export const SplitMemberSchema = z.object({
	item: SidebarTabSchema,
	isFocused: z.boolean(),
});

export type SplitMember = z.infer<typeof SplitMemberSchema>;

export const SidebarSplitSchema = z.object({
	kind: z.literal("split"),
	split: z.object({
		id: z.string(),
		isShown: z.boolean(),
		map: SplitMapSchema,
		members: z.array(SplitMemberSchema).readonly(),
	}),
});

export type SidebarSplit = z.infer<typeof SidebarSplitSchema>;

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

export const PlacedSidebarSchema = z.object({
	sections: z.array(SidebarSectionSchema).readonly(),
	newTabList: z.string(),
});

export type PlacedSidebar = z.infer<typeof PlacedSidebarSchema>;

export const SidebarAskSchema = z.object({
	at: TabsAskSchema,
});

export type SidebarAsk = z.infer<typeof SidebarAskSchema>;

export const HeldTabSchema = z.object({
	id: z.string(),
	app: PageAppSchema,
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

export const ClosedTabRowSchema = z.object({
	tabId: z.string().min(1),
	title: z.string(),
	app: AppKindSchema,
	address: z.string(),
	icon: TabArtSchema,
	favicon: z.string().nullable(),
});

export type ClosedTabRow = z.infer<typeof ClosedTabRowSchema>;

export const ClosedTabsSchema = z.object({ tabs: z.array(ClosedTabRowSchema).readonly() });

export const TabHoldersAskSchema = z.object({
	ids: z.array(z.string().min(1)).readonly(),
	window: z
		.string()
		.min(1)
		.nullable()
		.default(null)
		.describe("the places window that asks: a tab of the workspace no window shows answers this window"),
});

export const TabHoldersSchema = z.object({
	holders: z
		.array(
			z.object({
				id: z.string(),
				window: z.string().nullable(),
			}),
		)
		.readonly(),
});
