import { z } from "zod";
import { query } from "@widgetarium/core/mediator";
import { ShotAskSchema } from "../schema/shot-ask.schema.js";

export const ShotCountQuery = query("canvas/shot-count")
	.input(ShotAskSchema)
	.output(z.object({ count: z.number() }));
