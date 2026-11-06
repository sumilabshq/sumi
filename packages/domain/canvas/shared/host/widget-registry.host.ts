import type { WidgetRegistry } from "@widgetarium/core/registry.js";
import { isObject } from "@widgetarium/framework/is-object";
import { hostObject } from "@widgetarium/framework";

export const WidgetRegistryHost = hostObject<WidgetRegistry>("WidgetRegistry", isWidgetRegistry);

function isWidgetRegistry(held: unknown): held is WidgetRegistry {
	return isObject(held) && typeof held["get"] === "function" && typeof held["list"] === "function";
}
