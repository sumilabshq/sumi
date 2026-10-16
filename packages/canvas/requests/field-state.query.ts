import { z } from "zod";
import { query } from "@widgetarium/core/mediator";
import { GpuSupplySchema } from "../schema/drawing.schema.js";
import { SpotSchema } from "../schema/selection.schema.js";

export const FieldStateQuery = query("canvas/field-state").output(
	z.object({
		page: z.string(),
		isPointer: z.boolean(),
		flyTo: z.string().nullable(),
		pickedMark: z.string().nullable(),
		pickedSpot: SpotSchema.nullable(),
		unresolved: z.object({ widget: z.string(), mark: z.string() }).nullable(),
		gpu: GpuSupplySchema.nullable(),
	}),
);
