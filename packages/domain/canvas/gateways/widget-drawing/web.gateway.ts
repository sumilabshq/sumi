import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import { WidgetDrawingGateway } from "./widget-drawing.gateway.js";

const HOME = "/";

export class WebWidgetDrawingGateway extends WidgetDrawingGateway {
	constructor(project: StartedProject) {
		super({ registry: project.registry, host: project.hostOf(project.routes[0]?.path ?? HOME) });
	}
}
