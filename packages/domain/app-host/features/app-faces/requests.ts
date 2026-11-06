import { query } from "@widgetarium/data-framework";
import { PluginAppsGateway } from "../../gateways/plugin-apps/plugin-apps.gateway.js";
import { AppFacesSchema, KnownAppsSchema } from "../../shared/schema/app-tab.schema.js";
import { readAppFaces, readKnownApps } from "../../shared/lib/apps/known-apps.js";

export const AppFacesQuery = query("app-faces")
	.output(AppFacesSchema)
	.inject({ pluginApps: PluginAppsGateway })
	.handle((_input, { send, pluginApps }) => readAppFaces(send, pluginApps.pluginApps()));

export const KnownAppsQuery = query("known-apps")
	.output(KnownAppsSchema)
	.inject({ pluginApps: PluginAppsGateway })
	.handle(async (_input, { send, pluginApps }) => ({ apps: await readKnownApps(send, pluginApps.pluginApps()) }));
