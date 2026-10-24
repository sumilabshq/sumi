import { localPxMemory } from "@widgetarium/behaviors";
import { MemoryCanvasMomentGateway } from "../canvas-moment/memory.gateway.js";
import { MemoryPhotoWritesGateway } from "../photo-writes/memory.gateway.js";
import { PxMemorySidebarWidthGateway } from "../sidebar-width/px-memory.gateway.js";
import type { CanvasParts } from "./canvas-parts.gateway.js";

type OwnParts = Pick<CanvasParts, "canvasMoment" | "sidebarWidth" | "photoWrites">;

const SIDEBAR_WIDTH_KEY = "widgetarium-canvas-sidebar-px";

export function ownCanvasParts(): OwnParts {
	return {
		canvasMoment: new MemoryCanvasMomentGateway(),
		sidebarWidth: new PxMemorySidebarWidthGateway(localPxMemory(SIDEBAR_WIDTH_KEY)),
		photoWrites: new MemoryPhotoWritesGateway(),
	};
}
