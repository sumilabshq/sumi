import { z } from "zod";
import type { GpuSupply } from "@widgetarium/gpu";
import type { WidgetSurfaceProps } from "@widgetarium/core/surface/widget-surface.js";

export interface Drawing {
	readonly registry: WidgetSurfaceProps["registry"];
	readonly host: WidgetSurfaceProps["host"];
}

export const DrawingSchema = z.custom<Drawing>(isDrawing);

export const GpuSupplySchema = z.custom<GpuSupply>(isGpuSupply);

function isDrawing(held: unknown): held is Drawing {
	if (typeof held !== "object" || held === null) return false;
	const registry: unknown = Reflect.get(held, "registry");
	return typeof registry === "object" && registry !== null && typeof Reflect.get(registry, "get") === "function";
}

function isGpuSupply(held: unknown): held is GpuSupply {
	return typeof held === "object" && held !== null && typeof Reflect.get(held, "loadCanvasKit") === "function";
}
