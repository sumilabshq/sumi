import { z } from "zod";
import { query } from "@widgetarium/core/requests";
import { AppKindSchema } from "../../shared/schema/app-tab.schema.js";

export const PermitKindSchema = z.enum(["files", "network", "ink"]);

export type PermitKind = z.infer<typeof PermitKindSchema>;

export const PermitSchema = z.object({
	kind: PermitKindSchema,
	label: z.string(),
	scope: z.string(),
});

export type Permit = z.infer<typeof PermitSchema>;

const PickerAppFaceSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	icon: z.string(),
	permits: z.array(PermitSchema).readonly(),
	isBeta: z.boolean(),
});

export const PickerAppSchema = z.discriminatedUnion("kind", [
	PickerAppFaceSchema.extend({
		kind: z.literal("built-in"),
		app: AppKindSchema,
		openCount: z.number(),
	}),
	PickerAppFaceSchema.extend({ kind: z.literal("planned") }),
	PickerAppFaceSchema.extend({ kind: z.literal("mine") }),
]);

export type PickerApp = z.infer<typeof PickerAppSchema>;

export const AppPickerSchema = z.object({
	mine: z.array(PickerAppSchema).readonly(),
	builtIn: z.array(PickerAppSchema).readonly(),
});

export type AppPicker = z.infer<typeof AppPickerSchema>;

export const AppPickerQuery = query("app-host/app-picker")
	.input(z.object({ search: z.string() }))
	.output(AppPickerSchema)
	.settlesNow();
