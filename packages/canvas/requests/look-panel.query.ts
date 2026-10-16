import { z } from "zod";
import { query } from "@widgetarium/core/mediator";
import { LookRowSchema } from "../schema/look-row.schema.js";

export const LookPanelQuery = query("canvas/look-panel").output(
	z.discriminatedUnion("kind", [
		z.object({ kind: z.literal("none") }),
		z.object({ kind: z.literal("unreadable"), said: z.string() }),
		z.object({
			kind: z.literal("look"),
			system: z.string(),
			sheet: z.string(),
			fontsUrl: z.string().nullable(),
			rows: z.array(LookRowSchema),
		}),
	]),
);
