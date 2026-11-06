import type { ConfigFacts, Platform } from "@widgetarium/data-framework";
import type { AppHostConfig } from "../../shared/host/app-host.host.js";
import type { CoreChangesGateway } from "../core-changes/core-changes.gateway.js";
import type { EssentialsGateway } from "../essentials/essentials.gateway.js";
import type { PaneFlashGateway } from "../pane-flash/pane-flash.gateway.js";
import type { ShownViewGateway } from "../shown-view/shown-view.gateway.js";
import type { StudioWindowGateway } from "../studio-window/studio-window.gateway.js";
import { memoryAppHostParts } from "./memory.gateway.js";
import { tauriAppHostParts } from "./tauri.gateway.js";
import { webAppHostParts } from "./web.gateway.js";

export interface AppHostParts {
	readonly studioWindow: StudioWindowGateway;
	readonly essentials: EssentialsGateway;
	readonly shownView: ShownViewGateway;
	readonly paneFlash: PaneFlashGateway;
	readonly coreChanges: CoreChangesGateway;
}

const UNHOSTED_PARTS_ON: Readonly<Record<Platform, () => AppHostParts>> = {
	browser: webAppHostParts,
	tauri: webAppHostParts,
	server: memoryAppHostParts,
};

export function appHostPartsOn({ platform, config }: ConfigFacts<AppHostConfig>): AppHostParts {
	if (config.tauri !== undefined) {
		return tauriAppHostParts(config.tauri.store, config.tauri.coreChanges);
	}

	return UNHOSTED_PARTS_ON[platform]();
}
