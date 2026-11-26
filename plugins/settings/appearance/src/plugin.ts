import { settingsRegistry } from "@sumi/settings-registry-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import metadata from "../metadata.json" with { type: "json" };
import { appearancePage } from "./features/appearance/lib/appearance-page.js";

export const appearanceSettings = plugin("appearance-settings")
	.describe(metadata)
	.require(settingsRegistry)
	.apply((app) => {
		app.use(settingsRegistry).page(appearancePage);
	});
