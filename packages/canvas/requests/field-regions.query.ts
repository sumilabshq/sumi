import { z } from "zod";
import { query } from "@widgetarium/core/mediator";
import { RegionSchema } from "../schema/regions.schema.js";

export const FieldRegionsQuery = query("canvas/field-regions").output(z.object({ regions: z.array(RegionSchema) }));
