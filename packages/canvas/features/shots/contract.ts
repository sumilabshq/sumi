import { z } from "zod";
import { query } from "@widgetarium/core/requests";
import { BoardSchema } from "../../shared/schema/design.schema.js";
import { ShotAskSchema } from "../../shared/schema/shot-ask.schema.js";
import { RegionSchema } from "../../shared/schema/regions.schema.js";

export const NoteBoardQuery = query("canvas/note-board")
	.input(z.object({ note: z.string(), width: z.number() }))
	.output(z.object({ board: BoardSchema, width: z.number() }));

export const ShotCountQuery = query("canvas/shot-count")
	.input(ShotAskSchema)
	.output(z.object({ count: z.number() }));

export const ShotPartQuery = query("canvas/shot-part")
	.input(ShotAskSchema.extend({ at: z.number() }))
	.output(z.object({ region: RegionSchema }));
