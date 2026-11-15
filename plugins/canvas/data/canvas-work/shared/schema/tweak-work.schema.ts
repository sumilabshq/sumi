import { z } from "zod";
import { BoardIdSchema, NameSchema, PageIdSchema, CanvasIdSchema } from "./canvas-work.schema.js";

export const TweakIdSchema = z
	.string()
	.regex(/^[a-z][a-z0-9-]{0,39}$/)
	.describe("Lowercase letters, digits and dashes: the artboard reads it as var(--id), data-id and tweaks[id]");

export const TweakValueSchema = z.union([z.number(), z.boolean(), z.string().max(80)]);

export const TweakControlSchema = z.discriminatedUnion("kind", [
	z
		.object({
			kind: z.literal("number"),
			min: z.number(),
			max: z.number(),
			step: z.number().positive(),
			unit: z.string().max(8).describe("Joined to the number in CSS: px, %, ms, or empty for a bare number"),
		})
		.describe("A slider"),
	z.object({ kind: z.literal("toggle") }).describe("A switch; the value is true or false, 1 or 0 in CSS"),
	z
		.object({
			kind: z.literal("choice"),
			options: z.array(z.string().trim().min(1).max(80)).min(2).max(8),
		})
		.describe("One of a few options, each shown as written"),
]);

export const TweakAskSchema = z.object({
	id: TweakIdSchema,
	label: NameSchema.describe("The name the person reads beside the control"),
	control: TweakControlSchema,
	value: TweakValueSchema.describe("The first value, which Reset returns to; it must fit the control"),
});

export const WriteTweaksAskSchema = z.object({
	canvasId: CanvasIdSchema,
	board: BoardIdSchema.nullable()
		.default(null)
		.describe("An artboard whose own tweaks these are; null writes the page's tweaks, which reach every artboard on it"),
	page: PageIdSchema.nullable().default(null).describe("The page, when board is null; null is the shown page"),
	tweaks: z
		.array(TweakAskSchema)
		.max(24)
		.describe("Every tweak of that page or artboard, in order; the list replaces the ones written before"),
});

export const TweaksAskSchema = z.object({
	canvasId: CanvasIdSchema,
	page: PageIdSchema.nullable().default(null).describe("null reads the shown page"),
});

export const TweakReadSchema = z.object({
	id: z.string(),
	label: z.string(),
	page: z.string(),
	board: z.string().nullable(),
	control: TweakControlSchema,
	initial: TweakValueSchema,
	value: TweakValueSchema,
});
