import type { PluginAppFace } from "../../shared/host/app-host.host.js";

export abstract class PluginAppsGateway {
	abstract pluginApps(): readonly PluginAppFace[];
}
