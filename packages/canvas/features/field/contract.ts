import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { DrawingSchema } from "../../schema/drawing.schema.js";
import { RegionSchema } from "../../schema/regions.schema.js";
import { GpuSupplySchema } from "../../schema/drawing.schema.js";
import { SpotSchema } from "../../schema/selection.schema.js";
import { SelectionSchema } from "../../schema/selection.schema.js";

export const DrawingQuery = query("canvas/drawing").output(DrawingSchema);

export const FieldRegionsQuery = query("canvas/field-regions").output(z.object({ regions: z.array(RegionSchema) }));

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

export const PickSpotCommand = command("canvas/pick-spot")
	.input(z.object({ selection: SelectionSchema.nullable() }))
	.idempotencyKey(Repeatable);

export const ResolveSpotCommand = command("canvas/resolve-spot")
	.input(z.object({ spot: SpotSchema }))
	.idempotencyKey(Repeatable);
