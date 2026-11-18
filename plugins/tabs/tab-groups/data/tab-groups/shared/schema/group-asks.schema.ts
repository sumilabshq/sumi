import { z } from "zod";

export const GroupHueSchema = z.enum(["red", "orange", "amber", "green", "teal", "blue", "purple", "pink"]);

export const CreateGroupAskSchema = z.object({
	window: z.string().min(1),
	from: z.discriminatedUnion("kind", [
		z.object({ kind: z.literal("tab"), tabId: z.string().min(1) }),
		z.object({ kind: z.literal("list"), list: z.string().min(1) }),
		z.object({ kind: z.literal("group"), groupId: z.string().min(1) }),
	]),
	name: z.string().min(1).optional(),
	hue: GroupHueSchema.nullable().optional(),
});

export type CreateGroupAsk = z.infer<typeof CreateGroupAskSchema>;

export const GroupAskSchema = z.object({
	window: z.string().min(1),
	id: z.string().min(1),
});

export const PlaceGroupAskSchema = GroupAskSchema.extend({
	place: z.object({
		list: z.string().min(1),
		groupId: z.string().min(1).nullable().default(null),
		before: z.string().nullable(),
	}),
});

export type GroupPlaceAsked = z.infer<typeof PlaceGroupAskSchema>["place"];

export const RenameGroupAskSchema = GroupAskSchema.extend({
	name: z.string(),
});

export const GroupHueAskSchema = GroupAskSchema.extend({
	hue: GroupHueSchema.nullable(),
});

export const CreatedGroupSchema = z.object({
	id: z.string(),
});
