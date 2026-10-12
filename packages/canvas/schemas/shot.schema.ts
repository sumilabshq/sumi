import { z } from "zod";
import { BoardSchema, DrawnReferenceSchema, DrawnScreenSchema, DrawnWidgetSchema } from "./design.schema.js";

export const ShotSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("pages"), screens: z.array(DrawnScreenSchema).readonly() }),
	z.object({ kind: z.literal("references"), references: z.array(DrawnReferenceSchema).readonly() }),
	z.object({ kind: z.literal("widgets"), widgets: z.array(DrawnWidgetSchema).readonly() }),
	z.object({ kind: z.literal("board"), board: BoardSchema, width: z.number() }),
]);

export type Shot = z.output<typeof ShotSchema>;
