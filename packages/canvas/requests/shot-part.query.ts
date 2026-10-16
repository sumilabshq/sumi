import { z } from "zod";
import { query } from "@widgetarium/core/mediator";
import { RegionSchema } from "../schema/regions.schema.js";
import { ShotAskSchema } from "../schema/shot-ask.schema.js";

export const ShotPartQuery = query("canvas/shot-part")
	.input(ShotAskSchema.extend({ at: z.number() }))
	.output(z.object({ region: RegionSchema }));
