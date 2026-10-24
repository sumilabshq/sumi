import { z } from "zod";
import { CanvasDocSchema } from "./doc.schema.js";
import { NoteToneSchema } from "./note-tone.schema.js";
import { StatePictureSchema } from "./state-picture.schema.js";

export const FrameSchema = z.object({
	key: z.string(),
	label: z.string(),
	situation: z.string().nullable(),
	width: z.number(),
	height: z.number(),
	frame: z.string(),
	widget: z.string().nullable(),
	picture: StatePictureSchema.nullable(),
	refusal: z.string(),
});

export const ScreenGroupSchema = z.object({
	name: z.string(),
	sub: z.string(),
	frames: z.array(FrameSchema),
});

export const CalloutWidgetSchema = z.object({
	id: z.string(),
	name: z.string(),
});

export const CalloutSchema = z.object({
	text: z.string(),
	tone: NoteToneSchema,
	at: z.tuple([z.number(), z.number()]).optional(),
	widget: CalloutWidgetSchema.nullable(),
});

export const ReferenceShownSchema = z.object({
	key: z.string(),
	title: z.string(),
	badge: z.string().optional(),
	sub: z.string().optional(),
	src: z.string(),
	alt: z.string(),
	callouts: z.array(CalloutSchema),
});

export const WidgetCardSchema = z.object({
	key: z.string(),
	label: z.string(),
	widget: z.string(),
	width: z.number(),
	frame: z.string(),
	picture: StatePictureSchema,
});

export const WidgetGroupSchema = z.object({
	id: z.string(),
	title: z.string(),
	badge: z.string(),
	cards: z.array(WidgetCardSchema),
});

export const RegionSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("docs"),
		title: z.string(),
		count: z.number(),
		docs: z.array(CanvasDocSchema),
	}),
	z.object({
		kind: z.literal("references"),
		title: z.string(),
		count: z.number(),
		references: z.array(ReferenceShownSchema),
	}),
	z.object({
		kind: z.literal("pages"),
		title: z.string(),
		count: z.number(),
		screens: z.array(ScreenGroupSchema),
	}),
	z.object({
		kind: z.literal("planned"),
		title: z.string(),
		page: z.string(),
		width: z.number(),
		height: z.number(),
	}),
	z.object({
		kind: z.literal("nothing"),
		title: z.string(),
	}),
	z.object({
		kind: z.literal("widgets"),
		title: z.string(),
		count: z.number(),
		widgets: z.array(WidgetGroupSchema),
	}),
]);

export const FieldRegionsSchema = z.object({ regions: z.array(RegionSchema) });

export type Frame = z.output<typeof FrameSchema>;
export type CalloutShown = z.output<typeof CalloutSchema>;
export type ReferenceShown = z.output<typeof ReferenceShownSchema>;
export type WidgetCard = z.output<typeof WidgetCardSchema>;
export type Region = z.output<typeof RegionSchema>;
