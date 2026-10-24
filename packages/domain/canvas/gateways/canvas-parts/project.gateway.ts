import { WebAgentJobsGateway } from "../agent-jobs/web.gateway.js";
import { WebDesignFilesGateway } from "../design-files/web.gateway.js";
import { WebDesignFolderGateway } from "../design-folder/web.gateway.js";
import { HeldWidgetDrawingGateway } from "../widget-drawing/held.gateway.js";
import type { CanvasParts, ProjectHosts } from "./canvas-parts.gateway.js";
import { ownCanvasParts } from "./own-parts.gateway.js";

const HOME = "/";

export function projectCanvasParts({ project }: ProjectHosts): CanvasParts {
	return {
		...ownCanvasParts(),
		designFolder: new WebDesignFolderGateway(project),
		designFiles: new WebDesignFilesGateway(),
		agentJobs: new WebAgentJobsGateway(),
		widgetDrawing: new HeldWidgetDrawingGateway({
			registry: project.registry,
			host: project.hostOf(project.routes[0]?.path ?? HOME),
		}),
	};
}
