import { settingsRegistry } from "@sumi/settings-registry-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import metadata from "../metadata.json" with { type: "json" };
import { AppearancePage } from "./features/appearance/ui/appearance-page/appearance-page.js";

export const appearanceSettings = plugin("appearance-settings")
	.describe(metadata)
	.require(settingsRegistry)
	.apply((app) => {
		app.use(settingsRegistry).page({
			id: "appearance",
			title: "Appearance",
			icon: "palette",
			section: "Sumi",
			order: 10,
			keywords: ["theme", "dark", "light", "font", "ink", "colour", "text", "code"],
			view: AppearancePage,
		});
	});
