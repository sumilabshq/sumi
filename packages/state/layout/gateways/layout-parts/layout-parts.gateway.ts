import type { ConfigFacts, Platform } from "@widgetarium/data-framework";
import type { LayoutConfig } from "../../shared/host/layout.host.js";
import type { FrameSidesGateway } from "../frame-sides/frame-sides.gateway.js";
import type { FrameWidthsGateway } from "../frame-widths/frame-widths.gateway.js";
import type { PaneTreeGateway } from "../pane-tree/pane-tree.gateway.js";
import { serverLayoutParts } from "./server.gateway.js";
import { tauriLayoutParts } from "./tauri.gateway.js";
import { webLayoutParts } from "./web.gateway.js";

export interface LayoutParts {
	readonly frameSides: FrameSidesGateway;
	readonly frameWidths: FrameWidthsGateway;
	readonly paneTree: PaneTreeGateway;
}

const UNHOSTED_PARTS_ON: Readonly<Record<Platform, (workspaceId: string) => LayoutParts>> = {
	browser: webLayoutParts,
	tauri: webLayoutParts,
	server: () => serverLayoutParts(),
};

export function layoutPartsOn({ platform, scope, config }: ConfigFacts<LayoutConfig>): LayoutParts {
	if (config.tauri !== undefined) {
		return tauriLayoutParts(scope.workspaceId, config.tauri.store, config.tauri.windows);
	}

	return UNHOSTED_PARTS_ON[platform](scope.workspaceId);
}
