import { withBlocks } from "../../shared/lib/design/design-block-registry.js";
import { HostAgentJobsGateway } from "../agent-jobs/host.gateway.js";
import { ObsidianDesignFilesGateway } from "../design-files/obsidian.gateway.js";
import { ObsidianDesignFolderGateway } from "../design-folder/obsidian/obsidian.gateway.js";
import { HeldWidgetDrawingGateway } from "../widget-drawing/held.gateway.js";
import type { CanvasParts, VaultHosts } from "./canvas-parts.gateway.js";
import { ownCanvasParts } from "./own-parts.gateway.js";

export function vaultCanvasParts({ adapter, registry, drawingHost, agentJobs }: VaultHosts): CanvasParts {
	const drawnRegistry = withBlocks(registry);
	return {
		...ownCanvasParts(),
		designFolder: new ObsidianDesignFolderGateway(adapter, registry, drawnRegistry),
		designFiles: new ObsidianDesignFilesGateway(adapter),
		agentJobs: new HostAgentJobsGateway(agentJobs),
		widgetDrawing: new HeldWidgetDrawingGateway({
			registry: drawnRegistry,
			host: drawingHost,
		}),
	};
}
