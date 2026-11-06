import { isObject } from "@widgetarium/data-framework/is-object";
import { hostObject } from "@widgetarium/data-framework";
import type { Drawing } from "../schema/drawing.schema.js";

export const DrawingSurfaceHost = hostObject<Drawing["host"]>("SurfaceHost", isSurfaceHost);

function isSurfaceHost(held: unknown): held is Drawing["host"] {
	return isObject(held);
}
