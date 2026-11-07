import type { AppTabs } from "../../shared/host/app-tabs.host.js";
import { AppTabsGateway } from "./app-tabs.gateway.js";

export class PlacesAppTabsGateway extends AppTabsGateway {
	constructor(private readonly appTabs: AppTabs) {
		super();
	}

	override appOfTab(tab: string): Promise<string | null> {
		return this.appTabs.appOfTab(tab);
	}
}
