import type { DataAdapter } from "obsidian";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { WidgetRegistry } from "@widgetarium/core/registry.js";
import type { AgentJobs } from "../../shared/host/agent-jobs.host.js";
import type { Drawing } from "../../shared/schema/drawing.schema.js";
import type { AgentJobsGateway } from "../agent-jobs/agent-jobs.gateway.js";
import type { CanvasMomentGateway } from "../canvas-moment/canvas-moment.gateway.js";
import type { DesignFilesGateway } from "../design-files/design-files.gateway.js";
import type { DesignFolderGateway } from "../design-folder/design-folder.gateway.js";
import type { PhotoWritesGateway } from "../photo-writes/photo-writes.gateway.js";
import type { SidebarWidthGateway } from "../sidebar-width/sidebar-width.gateway.js";
import type { WidgetDrawingGateway } from "../widget-drawing/widget-drawing.gateway.js";
import { projectCanvasParts } from "./project.gateway.js";
import { vaultCanvasParts } from "./vault.gateway.js";

export type CanvasParts = {
	readonly canvasMoment: CanvasMomentGateway;
	readonly designFolder: DesignFolderGateway;
	readonly designFiles: DesignFilesGateway;
	readonly agentJobs: AgentJobsGateway;
	readonly widgetDrawing: WidgetDrawingGateway;
	readonly sidebarWidth: SidebarWidthGateway;
	readonly photoWrites: PhotoWritesGateway;
};

export interface VaultHosts {
	readonly kind: "vault";
	readonly adapter: DataAdapter;
	readonly registry: WidgetRegistry;
	readonly drawingHost: Drawing["host"];
	readonly agentJobs: AgentJobs;
}

export interface ProjectHosts {
	readonly kind: "project";
	readonly project: StartedProject;
}

export type CanvasHosts = VaultHosts | ProjectHosts;

export function canvasPartsOn({ config }: { readonly config: CanvasHosts }): CanvasParts {
	if (config.kind === "vault") {
		return vaultCanvasParts(config);
	}

	return projectCanvasParts(config);
}
