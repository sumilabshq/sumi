import { NoCoreChangesGateway } from "../core-changes/none.gateway.js";
import { LocalStorageEssentialsGateway } from "../essentials/local-storage.gateway.js";
import { DocumentPaneFlashGateway } from "../pane-flash/document.gateway.js";
import { MemoryStudioWindowGateway } from "../studio-window/memory.gateway.js";
import type { AppHostParts } from "./app-host-parts.gateway.js";

export function webAppHostParts(): AppHostParts {
	return {
		studioWindow: new MemoryStudioWindowGateway(),
		essentials: new LocalStorageEssentialsGateway(),
		paneFlash: new DocumentPaneFlashGateway(),
		coreChanges: new NoCoreChangesGateway(),
	};
}
