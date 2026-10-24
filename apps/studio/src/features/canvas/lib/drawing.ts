import { useQuery } from "@widgetarium/core/requests";
import type { WidgetSurfaceProps } from "@widgetarium/core/surface/widget-surface.js";
import { DrawingQuery } from "@widgetarium/canvas";

export interface Drawing {
	readonly registry: WidgetSurfaceProps["registry"];
	readonly host: WidgetSurfaceProps["host"];
}

const NOT_A_REGISTRY = "the canvas drawing holds no widget registry";

export function useDrawing(): Drawing {
	const { registry, host } = useQuery(DrawingQuery).data;

	if (!isDrawnRegistry(registry) || !isDrawnHost(host)) {
		throw new Error(NOT_A_REGISTRY);
	}

	return {
		registry,
		host,
	};
}

function isDrawnRegistry(held: object): held is Drawing["registry"] {
	return typeof Reflect.get(held, "get") === "function" && typeof Reflect.get(held, "list") === "function";
}

// TRADE-OFF: the host has no member every host carries, so only its being an object is checked
function isDrawnHost(held: object): held is Drawing["host"] {
	return typeof held === "object";
}
