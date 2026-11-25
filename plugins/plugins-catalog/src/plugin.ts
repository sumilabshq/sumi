import { settings } from "@sumi/settings-plugin";
import { assistant } from "@widgetarium/assistant/contract";
import { plugin } from "@widgetarium/plugin-framework";
import metadata from "../metadata.json" with { type: "json" };
import { PluginsPage } from "./features/catalog/ui/plugins-page/plugins-page.js";

export const pluginsCatalog = plugin("plugins-catalog")
	.describe(metadata)
	.require(settings)
	.apply((app) => {
		app
			.use(settings)
			.page({ id: "plugins", title: "Plugins", icon: "plug", group: "extend", order: 10, view: PluginsPage });
		app.use(settings).pageImport(({ windowServer }) => assistant({ over: windowServer }));
	});
