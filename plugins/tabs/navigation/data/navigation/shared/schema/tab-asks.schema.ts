import { z } from "zod";
import { TabsAskSchema } from "./screen.schema.js";
import { PageAppSchema, StudioViewSchema } from "./tabs.schema.js";

export const TabPlaceSchema = z.object({
	list: z.string().min(1),
	groupId: z.string().nullable(),
	before: z.string().nullable(),
});

export type TabPlaceAsked = z.infer<typeof TabPlaceSchema>;

export const SettleAskSchema = z.object({ at: TabsAskSchema });

export const TabAskSchema = z.object({
	at: TabsAskSchema,
	id: z.string().min(1),
});

export const ShowTabAskSchema = TabAskSchema.extend({
	paneId: z.string().min(1).nullable().default(null),
	isFollowingFocus: z.boolean().default(false),
});

export type ShowTabAsk = z.infer<typeof ShowTabAskSchema>;

export const RestoreTabsAskSchema = z.object({
	at: TabsAskSchema,
	isBeside: z.boolean(),
	keepsPages: z.boolean(),
});

export type RestoreTabsAsk = z.infer<typeof RestoreTabsAskSchema>;

export const PlaceTabAskSchema = z.object({
	at: TabsAskSchema,
	id: z.string().min(1),
	place: TabPlaceSchema,
});

export const OpenTabAskSchema = z.object({
	at: TabsAskSchema,
	app: PageAppSchema,
	list: z.string().nullable().default(null),
	groupId: z.string().nullable().default(null),
	address: z.string().default(""),
	show: z.boolean().default(true),
	reusesHeld: z.boolean().default(false),
});

export type OpenTabAsk = z.infer<typeof OpenTabAskSchema>;

export const OpenOnceAskSchema = z.object({
	at: TabsAskSchema,
	id: z.string().min(1),
	app: PageAppSchema,
	address: z.string().default(""),
});

export type OpenOnceAsk = z.infer<typeof OpenOnceAskSchema>;

export const NavigationTargetSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("app"),
		app: PageAppSchema,
		address: z.string().default(""),
	}),
	z.object({
		kind: z.literal("tab"),
		id: z.string().min(1),
		isMoved: z.boolean().default(false).describe("true takes the place of from; false leaves the tab where it stands"),
	}),
]);

export type NavigationTarget = z.infer<typeof NavigationTargetSchema>;

export const NavigationWhereSchema = z
	.enum(["this-tab", "new-tab"])
	.describe("this-tab puts the target in the place of the tab from, which closes; new-tab opens or shows it as its own tab");

export const NavigateAskSchema = z.object({
	at: TabsAskSchema,
	target: NavigationTargetSchema,
	where: NavigationWhereSchema,
	from: z.string().min(1).nullable().default(null),
});

export type NavigateAsk = z.infer<typeof NavigateAskSchema>;

export const DuplicateTabAskSchema = z.object({
	at: TabsAskSchema,
	id: z.string().min(1),
	list: z.string().nullable().default(null),
	groupId: z.string().nullable().default(null),
	show: z.boolean().default(true),
});

export type DuplicateTabAsk = z.infer<typeof DuplicateTabAskSchema>;

export const ReopenClosedAskSchema = z.object({
	at: TabsAskSchema,
	tabId: z.string().min(1).nullable(),
});

export const RenameTabAskSchema = z.object({
	window: z.string().min(1),
	id: z.string().min(1),
	label: z.string(),
});

export const ShowViewAskSchema = z.object({
	window: z.string().min(1),
	view: StudioViewSchema,
});
