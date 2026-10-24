import { z } from "zod";
import type { WidgetSurfaceProps } from "@widgetarium/core/surface/widget-surface.js";

export interface Drawing {
	readonly registry: WidgetSurfaceProps["registry"];
	readonly host: WidgetSurfaceProps["host"];
}

// TRADE-OFF: the registry and the host cross as plain objects, since their types live in core, which a contract may not name
export interface CanvasDrawing {
	readonly registry: object;
	readonly host: object;
}

export const DrawingSchema = z.custom<CanvasDrawing>();
