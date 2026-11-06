import type { ModuleFacts, Platform } from "@widgetarium/framework";
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

const PARTS_ON: Readonly<Record<Platform, (facts: ModuleFacts) => LayoutParts>> = {
	browser: ({ scope }) => webLayoutParts(scope.workspaceId),
	tauri: ({ scope }) => tauriLayoutParts(scope.workspaceId),
	server: () => serverLayoutParts(),
};

export function layoutPartsOn(facts: ModuleFacts): LayoutParts {
	return PARTS_ON[facts.platform](facts);
}
