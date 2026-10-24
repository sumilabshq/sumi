import { clientModule } from "@widgetarium/core/requests";
import { CachedDesignReads } from "./shared/lib/design/design-reads.js";
import { PhotoQueue } from "./shared/lib/photos/photo-queue.js";
import { MomentCanvasStore } from "./shared/lib/view/canvas-store.js";
import { createSidebarWidth } from "./shared/lib/view/sidebar-width.js";
import type { CanvasParts } from "./gateways/canvas-parts/canvas-parts.gateway.js";

export const CanvasClientModule = clientModule("canvas").provide((parts: CanvasParts) => ({
	...parts,
	canvasStore: new MomentCanvasStore(parts.canvasHost.opened, parts.canvasHost.keepOpening),
	designReads: new CachedDesignReads(parts.designFolderGateway, parts.agentJobsGateway, parts.designFilesGateway),
	photoQueue: new PhotoQueue(),
	sidebarWidth: createSidebarWidth(),
}));
