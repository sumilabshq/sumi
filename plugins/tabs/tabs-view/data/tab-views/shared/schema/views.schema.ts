import { z } from "zod";

export const ViewIdSchema = z
	.string()
	.regex(/^[a-z][a-z0-9-]*$/, "a tabs view id is lowercase letters, digits and dashes")
	.describe("the id a plugin gave its tabs view: header, sidebar");

export type ViewId = z.infer<typeof ViewIdSchema>;

export const ChosenViewSchema = z.object({
	view: ViewIdSchema.nullable().describe("null until the person chooses: the first view stands"),
});

export type ChosenView = z.infer<typeof ChosenViewSchema>;

export const ChooseViewSchema = z.object({
	view: ViewIdSchema,
});
