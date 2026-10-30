import { LocalStorageEssentialsGateway } from "../essentials/local-storage.gateway.js";
import { DocumentPaneFlashGateway } from "../pane-flash/document.gateway.js";
import { MemoryShownViewGateway } from "../shown-view/memory.gateway.js";
import { MemoryStudioWindowGateway } from "../studio-window/memory.gateway.js";
import type { AppHostParts } from "./app-host-parts.gateway.js";
import { STUDIO_OPENED_ON } from "./memory.gateway.js";

export function webAppHostParts(): AppHostParts {
	return {
		studioWindow: new MemoryStudioWindowGateway(),
		essentials: new LocalStorageEssentialsGateway(),
		shownView: new MemoryShownViewGateway(STUDIO_OPENED_ON),
		paneFlash: new DocumentPaneFlashGateway(),
	};
}
