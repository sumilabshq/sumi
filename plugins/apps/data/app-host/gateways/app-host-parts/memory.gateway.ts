import { NoCoreChangesGateway } from "../core-changes/none.gateway.js";
import { MemoryEssentialsGateway } from "../essentials/memory.gateway.js";
import { NoPaneFlashGateway } from "../pane-flash/none.gateway.js";
import { MemoryStudioWindowGateway } from "../studio-window/memory.gateway.js";
import type { AppHostParts } from "./app-host-parts.gateway.js";

export function memoryAppHostParts(): AppHostParts {
	return {
		studioWindow: new MemoryStudioWindowGateway(),
		essentials: new MemoryEssentialsGateway(null),
		paneFlash: new NoPaneFlashGateway(),
		coreChanges: new NoCoreChangesGateway(),
	};
}
