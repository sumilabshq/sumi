import { NoCoreChangesGateway } from "../core-changes/none.gateway.js";
import { DocumentPaneFlashGateway } from "../pane-flash/document.gateway.js";
import { MemoryStudioWindowGateway } from "../studio-window/memory.gateway.js";
import type { AppHostParts } from "./app-host-parts.gateway.js";

export function webAppHostParts(workspaceId: string): AppHostParts {
	return {
		studioWindow: new MemoryStudioWindowGateway(workspaceId),
		paneFlash: new DocumentPaneFlashGateway(),
		coreChanges: new NoCoreChangesGateway(),
	};
}
