import type { DataAdapter } from "obsidian";
import type { WidgetRegistry } from "@widgetarium/core/registry.js";
import type { CanvasHost } from "../canvas-host/canvas-host.gateway.js";
import { ObsidianWidgetDrawingGateway } from "../widget-drawing/obsidian.gateway.js";
import { ObsidianDesignFilesGateway } from "../design-files/obsidian.gateway.js";
import { ObsidianDesignFolderGateway } from "../design-folder/obsidian/obsidian.gateway.js";
import type { AgentJobsGateway } from "../agent-jobs/agent-jobs.gateway.js";
import type { CanvasParts } from "./canvas-parts.gateway.js";
import type { Drawing } from "../../shared/schema/drawing.schema.js";

export interface ObsidianDesign {
	readonly adapter: DataAdapter;
	readonly registry: WidgetRegistry;
	readonly host: Drawing["host"];
	readonly jobs: AgentJobsGateway;
}

export function obsidianCanvasParts(
	{ adapter, registry, host, jobs }: ObsidianDesign,
	canvasHost: CanvasHost,
): CanvasParts {
	return {
		canvasHost,
		designFolderGateway: new ObsidianDesignFolderGateway(adapter, registry),
		agentJobsGateway: jobs,
		widgetDrawingGateway: new ObsidianWidgetDrawingGateway(registry, host),
		designFilesGateway: new ObsidianDesignFilesGateway(adapter),
	};
}
