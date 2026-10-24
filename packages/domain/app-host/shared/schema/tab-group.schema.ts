import { z } from "zod";

export const WorkspaceListSchema = z.literal("workspace");

export const GroupHueSchema = z.enum(["red", "orange", "amber", "green", "teal", "blue", "purple", "pink"]);

export type GroupHue = z.infer<typeof GroupHueSchema>;

export const KeptGroupSchema = z.object({
	id: z.string(),
	name: z.string(),
	hue: GroupHueSchema.nullable(),
	isOpen: z.boolean(),
	tabIds: z.array(z.string()),
});

export const ListEntrySchema = z.object({
	kind: z.enum(["tab", "group"]),
	id: z.string(),
});

export type ListEntry = z.infer<typeof ListEntrySchema>;
