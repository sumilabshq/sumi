import { z } from "zod";
import type { Board } from "@widgetarium/core/model.js";
import { NOTE_TONES } from "@widgetarium/core/app-design.js";
import { FrameSizeSchema } from "./frame-size.schema.js";

export const BoardSchema = z.custom<Board>(isBoard);

export const StatePictureSchema = z.object({
	widget: z.string(),
	props: z.record(z.string(), z.unknown()).readonly(),
});

export const DrawnStateSchema = z.object({
	name: z.string(),
	board: BoardSchema.nullable(),
	picture: StatePictureSchema.optional(),
	refusal: z.string().optional(),
	situation: z.string().optional(),
	size: FrameSizeSchema.optional(),
});

export const DrawnScreenSchema = z.object({
	name: z.string(),
	states: z.array(DrawnStateSchema).readonly(),
});

export const ReferenceNoteSchema = z.object({
	text: z.string(),
	tone: z.enum(NOTE_TONES),
	at: z.tuple([z.number(), z.number()]).optional(),
	into: z.string().optional(),
});

export const DrawnReferenceSchema = z.object({
	name: z.string(),
	src: z.string(),
	why: z.string().optional(),
	kind: z.string().optional(),
	pages: z.array(z.string()).readonly(),
	notes: z.array(ReferenceNoteSchema).readonly(),
});

export const DrawnWidgetSchema = z.object({
	id: z.string(),
	isFromCatalogue: z.boolean(),
});

export const DrawnDesignSchema = z.object({
	screens: z.array(DrawnScreenSchema).readonly(),
	references: z.array(DrawnReferenceSchema).readonly(),
	widgets: z.array(DrawnWidgetSchema).readonly(),
});

export const ReadDesignSchema = DrawnDesignSchema.extend({ app: z.string(), stamp: z.number() });

export type StatePicture = z.output<typeof StatePictureSchema>;
export type DrawnState = z.output<typeof DrawnStateSchema>;
export type DrawnScreen = z.output<typeof DrawnScreenSchema>;
export type ReferenceNote = z.output<typeof ReferenceNoteSchema>;
export type DrawnReference = z.output<typeof DrawnReferenceSchema>;
export type DrawnWidget = z.output<typeof DrawnWidgetSchema>;
export type DrawnDesign = z.output<typeof DrawnDesignSchema>;
export type ReadDesign = z.output<typeof ReadDesignSchema>;

function isBoard(held: unknown): held is Board {
	return typeof held === "object" && held !== null && Array.isArray(Reflect.get(held, "tiles"));
}
