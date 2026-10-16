import { query } from "@widgetarium/core/mediator";
import { DrawingSchema } from "../schema/drawing.schema.js";

export const DrawingQuery = query("canvas/drawing").output(DrawingSchema);
