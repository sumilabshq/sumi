import type { ModuleFacts, Platform } from "@widgetarium/data-framework";
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
}

const PARTS_ON: Readonly<Record<Platform, (facts: ModuleFacts) => AppHostParts>> = {
	browser: () => webAppHostParts(),
	tauri: () => tauriAppHostParts(),
	server: () => memoryAppHostParts(),
};

export function appHostPartsOn(facts: ModuleFacts): AppHostParts {
	return PARTS_ON[facts.platform](facts);
}
