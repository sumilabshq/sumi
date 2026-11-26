import { settingsRegistry } from "@sumi/settings-registry-plugin";
import { assistant } from "@widgetarium/assistant/contract";
import { plugin } from "@widgetarium/plugin-framework";
import metadata from "../metadata.json" with { type: "json" };
import { pluginsPage } from "./features/catalog/lib/plugins-page.js";

export const pluginsSettings = plugin("plugins-settings")
	.describe(metadata)
	.require(settingsRegistry)
	.apply((app) => {
		app.use(settingsRegistry).addPage(pluginsPage);
		app.use(settingsRegistry).addPageImport(({ windowServer }) => assistant({ over: windowServer }));
	});
