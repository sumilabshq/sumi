import type { AppTabsGateway } from "../app-tabs/app-tabs.gateway.js";

export interface AppHostParts {
	readonly appTabsGateway: AppTabsGateway;
}
