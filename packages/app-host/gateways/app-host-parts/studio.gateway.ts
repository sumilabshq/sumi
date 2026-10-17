import type { StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import { StudioStateAppTabsGateway } from "../app-tabs/studio-state.gateway.js";
import type { AppHostParts } from "./app-host-parts.gateway.js";

export function studioAppHostParts(studioState: StudioState): AppHostParts {
	return { appTabsGateway: new StudioStateAppTabsGateway(studioState) };
}
