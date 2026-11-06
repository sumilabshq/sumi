import type { HostFacts, Platform } from "@widgetarium/data-framework";
import type { AppHostLent } from "../../shared/host/app-host.host.js";
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

export function appHostPartsOn({ platform, host }: HostFacts<AppHostLent>): AppHostParts {
	if (host.kind === "tauri") {
		return tauriAppHostParts(host.store, host.coreChanges);
	}

	return UNHOSTED_PARTS_ON[platform]();
}
