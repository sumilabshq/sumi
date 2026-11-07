import { z } from "zod";
import { TabEffectSchema, TabsAskSchema, StudioViewSchema } from "./screen.schema.js";
import { KeptSplitSchema, SplitSideSchema } from "./splits.schema.js";

export const ReorderSplitMemberAskSchema = z.object({
	at: TabsAskSchema,
	tabId: z.string().min(1),
	before: z.string().min(1).nullable(),
});

export const PlaceInViewAskSchema = z.object({
	at: TabsAskSchema,
	tabId: z.string().min(1),
	targetTabId: z.string().min(1).nullable(),
	side: SplitSideSchema,
	isPaneMoved: z.boolean().default(false),
});

export const SplitMemberAskSchema = z.object({
	at: TabsAskSchema,
	tabId: z.string().min(1),
});

export const ResizeSplitAskSchema = z.object({
	at: TabsAskSchema,
	branchId: z.string().min(1),
	edge: z.number().int().nonnegative(),
	share: z.number().positive(),
});

export const PlacedInViewSchema = z.object({
	view: StudioViewSchema,
	effects: z.array(TabEffectSchema),
	isPlaced: z.boolean(),
});

export const LeftSplitSchema = z.object({
	view: StudioViewSchema,
	effects: z.array(TabEffectSchema),
	isMember: z.boolean(),
});

export const ShownSplitSchema = z.object({
	shownId: z.string().nullable(),
	split: KeptSplitSchema.nullable(),
});

export type ShownSplit = z.infer<typeof ShownSplitSchema>;
