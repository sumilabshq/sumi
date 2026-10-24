import { z } from "zod";

export const BoxSchema = z.object({
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
});

export const SpotSchema = z.object({
	mark: z.string(),
	screen: BoxSchema,
	target: BoxSchema,
	radius: z.number(),
});

export const SelectionSchema = z.object({
	widget: z.string(),
	mark: z.string(),
	spot: SpotSchema.nullable(),
});

export const SpotPickSchema = z.object({ selection: SelectionSchema.nullable() });

export const SpotFoundSchema = z.object({ spot: SpotSchema });

export const UnresolvedSpotSchema = z.object({
	widget: z.string(),
	mark: z.string(),
});

export const FieldStateSchema = z.object({
	page: z.string(),
	isPointer: z.boolean(),
	flyTo: z.string().nullable(),
	pickedMark: z.string().nullable(),
	pickedSpot: SpotSchema.nullable(),
	unresolved: UnresolvedSpotSchema.nullable(),
});

export type Spot = z.output<typeof SpotSchema>;
export type Selection = z.output<typeof SelectionSchema>;
export type FieldState = z.output<typeof FieldStateSchema>;
