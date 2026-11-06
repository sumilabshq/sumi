import type { PluginAppFace } from "../../shared/host/app-host.host.js";
import { PluginAppsGateway } from "./plugin-apps.gateway.js";

export class ListedPluginAppsGateway extends PluginAppsGateway {
	constructor(private readonly listed: readonly PluginAppFace[]) {
		super();
	}

	pluginApps(): readonly PluginAppFace[] {
		return this.listed;
	}
}
