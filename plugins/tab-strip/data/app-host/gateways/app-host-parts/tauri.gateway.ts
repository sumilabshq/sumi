import { studioWindowOf } from "@widgetarium/behaviors";
import type { CoreChanges } from "../../shared/host/app-host.host.js";
import { LentCoreChangesGateway } from "../core-changes/lent.gateway.js";
import { DocumentPaneFlashGateway } from "../pane-flash/document.gateway.js";
import { TauriStudioWindowGateway } from "../studio-window/tauri.gateway.js";
import type { AppHostParts } from "./app-host-parts.gateway.js";

export function tauriAppHostParts(coreChanges: CoreChanges, workspaceId: string): AppHostParts {
	const studioWindow = studioWindowOf(location.search);
	return {
		studioWindow: new TauriStudioWindowGateway(studioWindow, workspaceId),
		paneFlash: new DocumentPaneFlashGateway(),
		coreChanges: new LentCoreChangesGateway(coreChanges),
	};
}
