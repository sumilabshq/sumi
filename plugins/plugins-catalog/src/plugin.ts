import { settingsRegistry } from "@sumi/settings-registry-plugin";
import { assistant } from "@widgetarium/assistant/contract";
import { plugin } from "@widgetarium/plugin-framework";
import metadata from "../metadata.json" with { type: "json" };
import { PluginsPage } from "./features/catalog/ui/plugins-page/plugins-page.js";

export const pluginsCatalog = plugin("plugins-catalog")
	.describe(metadata)
	.require(settingsRegistry)
	.apply((app) => {
		app.use(settingsRegistry).page({
			id: "plugins",
			title: "Plugins",
			icon: "plug",
			section: "Extend Sumi",
			order: 10,
			keywords: ["extension", "add-on", "build", "install", "skill"],
			view: PluginsPage,
		});
		app.use(settingsRegistry).pageImport(({ windowServer }) => assistant({ over: windowServer }));
	});
