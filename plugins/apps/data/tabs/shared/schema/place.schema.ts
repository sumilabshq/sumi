import { z } from "zod";

export const GroupColourSchema = z.enum(["red", "orange", "amber", "green", "teal", "blue", "purple", "pink"]);

export type GroupColour = z.infer<typeof GroupColourSchema>;

export const PlaceSchema = z
	.enum(["workspace", "pinned"])
	.default("workspace")
	.describe("workspace (the Open list, default) or pinned.");

export const NewGroupSchema = z.strictObject({
	name: z.string().min(1),
	colour: GroupColourSchema.optional(),
});

export const GroupingSchema = z.strictObject({
	place: PlaceSchema,
	group: z.string().min(1).optional().describe("Id of a group in that place to put the tab in."),
	newGroup: NewGroupSchema.optional().describe("A group to create in that place and put the tab in."),
	show: z.boolean().default(false).describe("Show the tab to the person. Default false."),
});

export type Grouping = z.output<typeof GroupingSchema>;
