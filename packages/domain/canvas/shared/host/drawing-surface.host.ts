import { isObject } from "@widgetarium/core/engine/is-object.js";
import { hostObject } from "@widgetarium/core/requests";
import type { Drawing } from "../schema/drawing.schema.js";

export const DrawingSurfaceHost = hostObject<Drawing["host"]>("SurfaceHost", isSurfaceHost);

function isSurfaceHost(held: unknown): held is Drawing["host"] {
	return isObject(held);
}
