import type { WidgetRegistry } from "@widgetarium/core/registry.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { hostObject } from "@widgetarium/core/requests";

export const WidgetRegistryHost = hostObject<WidgetRegistry>("WidgetRegistry", isWidgetRegistry);

function isWidgetRegistry(held: unknown): held is WidgetRegistry {
	return isObject(held) && typeof held["get"] === "function" && typeof held["list"] === "function";
}
