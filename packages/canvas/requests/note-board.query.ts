import { z } from "zod";
import { query } from "@widgetarium/core/mediator";
import { BoardSchema } from "../schema/design.schema.js";

export const NoteBoardQuery = query("canvas/note-board")
	.input(z.object({ note: z.string(), width: z.number() }))
	.output(z.object({ board: BoardSchema, width: z.number() }));
