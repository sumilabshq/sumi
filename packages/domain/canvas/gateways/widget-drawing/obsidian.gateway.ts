import type { WidgetRegistry } from "@widgetarium/core/registry.js";
import type { Drawing } from "../../shared/schema/drawing.schema.js";
import { withBlocks } from "../../shared/lib/design/design-block-registry.js";
import { WidgetDrawingGateway } from "./widget-drawing.gateway.js";

export class ObsidianWidgetDrawingGateway extends WidgetDrawingGateway {
	constructor(registry: WidgetRegistry, host: Drawing["host"]) {
		super({ registry: withBlocks(registry), host });
	}
}
