import { NoCoreChangesGateway } from "../core-changes/none.gateway.js";
import { NoPaneFlashGateway } from "../pane-flash/none.gateway.js";
import { MemoryStudioWindowGateway } from "../studio-window/memory.gateway.js";
import { MemorySidePeeksGateway } from "../side-peeks/memory.gateway.js";
import type { AppHostParts } from "./app-host-parts.gateway.js";

export function memoryAppHostParts(workspaceId: string): AppHostParts {
	return {
		studioWindow: new MemoryStudioWindowGateway(workspaceId),
		paneFlash: new NoPaneFlashGateway(),
		coreChanges: new NoCoreChangesGateway(),
		sidePeeks: new MemorySidePeeksGateway(),
	};
}
