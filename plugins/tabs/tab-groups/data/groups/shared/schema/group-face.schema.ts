import { z } from "zod";

export const GroupHueSchema = z.enum(["red", "orange", "amber", "green", "teal", "blue", "purple", "pink"]);

export const GroupFaceSchema = z.object({
	name: z.string().min(1).optional(),
	hue: GroupHueSchema.nullable().optional(),
});

export const NewGroupSchema = z.union([z.object({ withTabId: z.string() }), z.object({ list: z.string() })]).and(GroupFaceSchema);

export const GroupIdSchema = z.object({
	id: z.string(),
});

export const GroupNameSchema = GroupIdSchema.extend({
	name: z.string(),
});

export const GroupHueAskSchema = GroupIdSchema.extend({
	hue: GroupHueSchema.nullable(),
});

export const GroupPlaceSchema = z.object({
	id: z.string().min(1),
	to: z.object({
		list: z.string().min(1),
		before: z.string().nullable(),
	}),
});
