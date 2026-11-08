import { z } from "zod";
import { TabsAskSchema } from "./screen.schema.js";
import { EssentialSchema } from "./tab-rows.schema.js";
import { AppKindSchema, GroupHueSchema, PageAppSchema, StudioViewSchema } from "./tabs.schema.js";

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
	essentials: z.array(EssentialSchema),
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

export const PinTabAskSchema = z.object({
	window: z.string().min(1),
	id: z.string().min(1),
	isPinned: z.boolean(),
});

export const CreateGroupAskSchema = z.object({
	window: z.string().min(1),
	from: z.discriminatedUnion("kind", [
		z.object({ kind: z.literal("tab"), tabId: z.string().min(1) }),
		z.object({ kind: z.literal("list"), list: z.string().min(1) }),
	]),
	name: z.string().min(1).optional(),
	hue: GroupHueSchema.nullable().optional(),
});

export type CreateGroupAsk = z.infer<typeof CreateGroupAskSchema>;

export const FoldTabAskSchema = z.object({
	window: z.string().min(1),
	id: z.string().min(1),
});

export const GroupAskSchema = z.object({
	window: z.string().min(1),
	id: z.string().min(1),
});

export const PlaceGroupAskSchema = GroupAskSchema.extend({
	place: TabPlaceSchema.omit({ groupId: true }),
});

export type GroupPlaceAsked = z.infer<typeof PlaceGroupAskSchema>["place"];

export const RenameGroupAskSchema = z.object({
	window: z.string().min(1),
	id: z.string().min(1),
	name: z.string(),
});

export const GroupHueAskSchema = z.object({
	window: z.string().min(1),
	id: z.string().min(1),
	hue: GroupHueSchema.nullable(),
});

export const EssentialRefSchema = z.object({
	id: z.string().min(1),
	app: AppKindSchema,
	address: z.string().nullable(),
});

export type EssentialRef = z.infer<typeof EssentialRefSchema>;

export const ShowEssentialAskSchema = z.object({
	at: TabsAskSchema,
	essential: EssentialRefSchema,
});

export const ReleaseEssentialAskSchema = z.object({
	at: TabsAskSchema,
	essential: EssentialRefSchema,
	place: TabPlaceSchema,
});

export const CloseEssentialAskSchema = z.object({
	at: TabsAskSchema,
	essentialId: z.string().min(1),
});

export const MakeEssentialAskSchema = z.object({
	at: TabsAskSchema,
	id: z.string().min(1),
	essentialId: z.string().min(1),
});

export const ShowViewAskSchema = z.object({
	window: z.string().min(1),
	view: StudioViewSchema,
});
