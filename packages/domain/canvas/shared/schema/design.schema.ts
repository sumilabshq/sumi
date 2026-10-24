import { z } from "zod";
import type { Board } from "@widgetarium/core/model.js";
import { NOTE_TONES } from "@widgetarium/core/app-design.js";
import { FrameSizeSchema } from "./frame-size.schema.js";

export const BoardSchema = z.custom<Board>(isBoard);

export interface StatePicture {
	readonly widget: string;
	readonly props: Readonly<Record<string, unknown>>;
	readonly mounts: Readonly<Record<string, readonly MountPicture[]>> | null;
}

export interface MountPicture {
	readonly name: string;
	readonly widget: string;
	readonly title: string;
	readonly surface: "group" | "none" | null;
	readonly picture: StatePicture;
}

export const StatePictureSchema: z.ZodType<StatePicture> = z.object({
	widget: z.string(),
	props: z.record(z.string(), z.unknown()).readonly(),
	get mounts() {
		return z.record(z.string(), z.array(MountPictureSchema).readonly()).readonly().nullable();
	},
});

const MountPictureSchema: z.ZodType<MountPicture> = z.object({
	name: z.string(),
	widget: z.string(),
	title: z.string(),
	surface: z.enum(["group", "none"]).nullable(),
	get picture() {
		return StatePictureSchema;
	},
});

const DrawnStateSchema = z.object({
	name: z.string(),
	board: BoardSchema.nullable(),
	picture: StatePictureSchema.optional(),
	refusal: z.string().optional(),
	situation: z.string().optional(),
	size: FrameSizeSchema.optional(),
});

const DrawnScreenSchema = z.object({
	name: z.string(),
	states: z.array(DrawnStateSchema).readonly(),
});

export const ReferenceNoteSchema = z.object({
	text: z.string(),
	tone: z.enum(NOTE_TONES),
	at: z.tuple([z.number(), z.number()]).optional(),
	into: z.string().optional(),
});

const DrawnReferenceSchema = z.object({
	name: z.string(),
	src: z.string(),
	why: z.string().optional(),
	kind: z.string().optional(),
	pages: z.array(z.string()).readonly(),
	notes: z.array(ReferenceNoteSchema).readonly(),
});

const DrawnWidgetSchema = z.object({
	id: z.string(),
	isFromCatalogue: z.boolean(),
});

const DrawnDesignSchema = z.object({
	screens: z.array(DrawnScreenSchema).readonly(),
	references: z.array(DrawnReferenceSchema).readonly(),
	widgets: z.array(DrawnWidgetSchema).readonly(),
});

export type DrawnState = z.output<typeof DrawnStateSchema>;
export type DrawnScreen = z.output<typeof DrawnScreenSchema>;
export type ReferenceNote = z.output<typeof ReferenceNoteSchema>;
export type DrawnReference = z.output<typeof DrawnReferenceSchema>;
export type DrawnWidget = z.output<typeof DrawnWidgetSchema>;
export type DrawnDesign = z.output<typeof DrawnDesignSchema>;

export function frameLabelOf(screen: DrawnScreen, state: string): string {
	return screen.states.length < 2 || state === screen.name ? screen.name : `${screen.name} · ${state}`;
}

export function statePropsOf<Props>(
	states: Readonly<Record<string, Props>>,
	state: string | null | undefined,
): Props | undefined {
	const [first] = Object.keys(states);
	return states[state ?? first ?? ""];
}

function isBoard(held: unknown): held is Board {
	return typeof held === "object" && held !== null && Array.isArray(Reflect.get(held, "tiles"));
}
