import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { CanvasHost } from "../canvas-host/canvas-host.gateway.js";
import { WebWidgetDrawingGateway } from "../widget-drawing/web.gateway.js";
import { WebDesignFilesGateway } from "../design-files/web.gateway.js";
import { WebDesignFolderGateway } from "../design-folder/web.gateway.js";
import { WebAgentJobsGateway } from "../agent-jobs/web.gateway.js";
import type { CanvasParts } from "./canvas-parts.gateway.js";

export function webCanvasParts(project: StartedProject, canvasHost: CanvasHost): CanvasParts {
	return {
		canvasHost,
		designFolderGateway: new WebDesignFolderGateway(project),
		agentJobsGateway: new WebAgentJobsGateway(),
		widgetDrawingGateway: new WebWidgetDrawingGateway(project),
		designFilesGateway: new WebDesignFilesGateway(),
	};
}
