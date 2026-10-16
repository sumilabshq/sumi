import type { CanvasHost } from "../canvas-host/canvas-host.gateway.js";
import type { WidgetDrawingGateway } from "../widget-drawing/widget-drawing.gateway.js";
import type { DesignFilesGateway } from "../design-files/design-files.gateway.js";
import type { DesignFolderGateway } from "../design-folder/design-folder.gateway.js";
import type { AgentJobsGateway } from "../agent-jobs/agent-jobs.gateway.js";

export interface CanvasParts {
	readonly canvasHost: CanvasHost;
	readonly designFolderGateway: DesignFolderGateway;
	readonly agentJobsGateway: AgentJobsGateway;
	readonly widgetDrawingGateway: WidgetDrawingGateway;
	readonly designFilesGateway: DesignFilesGateway;
}
