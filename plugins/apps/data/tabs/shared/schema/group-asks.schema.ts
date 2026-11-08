import { z } from "zod";
import { GroupColourSchema, PlaceSchema } from "./place.schema.js";

export const GroupCreateSchema = z.strictObject({
	name: z.string().min(1),
	colour: GroupColourSchema.optional(),
	place: PlaceSchema,
	tabIds: z.array(z.string().min(1)).default([]).describe("Tabs of this chat or Recents to move into the group."),
});

export type GroupCreate = z.output<typeof GroupCreateSchema>;

export const CreatedGroupSchema = z.object({
	id: z.string(),
	name: z.string(),
	colour: GroupColourSchema.optional(),
	place: z.string(),
	tabIds: z.array(z.string()),
});

export const GroupEditSchema = z.strictObject({
	groupId: z.string().min(1),
	name: z.string().min(1).optional(),
	colour: GroupColourSchema.nullable().optional().describe("A colour, or null to take the colour away."),
});

export const EditedGroupSchema = z.object({
	updated: z.string(),
});

export const GroupRemoveSchema = z.strictObject({
	groupId: z.string().min(1),
	keepTabs: z.boolean().default(true).describe("true (default) leaves its tabs in the list; false closes them too."),
});

export const RemovedGroupSchema = z.object({
	deleted: z.string(),
	keptTabs: z.boolean(),
});
