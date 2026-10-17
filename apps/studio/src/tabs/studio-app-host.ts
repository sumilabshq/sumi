import { studioAppHostParts } from "@widgetarium/app-host/gateways";
import type { AppHostParts } from "@widgetarium/app-host/gateways";
import type { BrowserParts } from "@widgetarium/browser/gateways";
import type { StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import { BrowserAppPageFactsGateway } from "./browser-page-facts.gateway.js";

export interface StudioAppHostAsk {
	readonly state: StudioState;
	readonly browser: BrowserParts;
	readonly workspace: string;
}

export function startedAppHostParts({ state, browser, workspace }: StudioAppHostAsk): AppHostParts {
	return studioAppHostParts({
		studioState: state,
		workspace,
		pageFactsGateway: new BrowserAppPageFactsGateway(browser),
	});
}
