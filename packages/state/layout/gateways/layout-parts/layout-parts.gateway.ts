import type { ConfigFacts, Platform } from "@widgetarium/data-framework";
import type { LayoutConfig } from "../../shared/host/layout.host.js";
import type { FrameWidthsGateway } from "../frame-widths/frame-widths.gateway.js";
import { serverLayoutParts } from "./server.gateway.js";
import { tauriLayoutParts } from "./tauri.gateway.js";
import { webLayoutParts } from "./web.gateway.js";

export interface LayoutParts {
	readonly frameWidths: FrameWidthsGateway;
}

const UNHOSTED_PARTS_ON: Readonly<Record<Platform, () => LayoutParts>> = {
	browser: webLayoutParts,
	tauri: webLayoutParts,
	server: serverLayoutParts,
};

export function layoutPartsOn({ platform, config }: ConfigFacts<LayoutConfig>): LayoutParts {
	if (config.tauri !== undefined) {
		return tauriLayoutParts(config.tauri.store);
	}

	return UNHOSTED_PARTS_ON[platform]();
}
