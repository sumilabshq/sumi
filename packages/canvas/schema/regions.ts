import { z } from "zod";
import { NOTE_TONES } from "@widgetarium/core/app-design.js";
import { BoardSchema, StatePictureSchema } from "./design.js";
import { CanvasDocSchema } from "./doc.js";

export const FrameSchema = z.object({
	key: z.string(),
	label: z.string(),
	situation: z.string().nullable(),
	width: z.number(),
	height: z.number(),
	frame: z.string(),
	pictureKey: z.string(),
	widget: z.string().nullable(),
	picture: StatePictureSchema.nullable(),
	board: BoardSchema.nullable(),
	refusal: z.string(),
});

export const ScreenGroupSchema = z.object({ name: z.string(), sub: z.string(), frames: z.array(FrameSchema) });

export const CalloutSchema = z.object({
	text: z.string(),
	tone: z.enum(NOTE_TONES),
	at: z.tuple([z.number(), z.number()]).optional(),
	widget: z.object({ id: z.string(), name: z.string() }).nullable(),
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
	pictureKey: z.string(),
	picture: StatePictureSchema.nullable(),
});

export const WidgetGroupSchema = z.object({
	id: z.string(),
	title: z.string(),
	badge: z.string(),
	cards: z.array(WidgetCardSchema),
});

export const RegionSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("docs"), title: z.string(), count: z.number(), docs: z.array(CanvasDocSchema) }),
	z.object({
		kind: z.literal("references"),
		title: z.string(),
		count: z.number(),
		references: z.array(ReferenceShownSchema),
	}),
	z.object({ kind: z.literal("pages"), title: z.string(), count: z.number(), screens: z.array(ScreenGroupSchema) }),
	z.object({ kind: z.literal("planned"), title: z.string(), page: z.string(), width: z.number(), height: z.number() }),
	z.object({ kind: z.literal("nothing"), title: z.string() }),
	z.object({ kind: z.literal("widgets"), title: z.string(), count: z.number(), widgets: z.array(WidgetGroupSchema) }),
]);

export type Frame = z.output<typeof FrameSchema>;
export type ScreenGroup = z.output<typeof ScreenGroupSchema>;
export type CalloutShown = z.output<typeof CalloutSchema>;
export type ReferenceShown = z.output<typeof ReferenceShownSchema>;
export type WidgetCard = z.output<typeof WidgetCardSchema>;
export type WidgetGroup = z.output<typeof WidgetGroupSchema>;
export type Region = z.output<typeof RegionSchema>;

export type RegionOf<K extends Region["kind"]> = Extract<Region, { readonly kind: K }>;
