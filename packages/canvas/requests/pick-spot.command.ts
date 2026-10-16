import { z } from "zod";
import { command } from "@widgetarium/core/mediator";
import { SelectionSchema } from "../schema/selection.schema.js";

export const PickSpotCommand = command("canvas/pick-spot")
	.input(z.object({ selection: SelectionSchema.nullable() }))
	.idempotencyKey("none");
