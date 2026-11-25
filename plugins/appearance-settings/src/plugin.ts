import { settings } from "@sumi/settings-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import metadata from "../metadata.json" with { type: "json" };
import { AppearancePage } from "./features/appearance/ui/appearance-page/appearance-page.js";

export const appearanceSettings = plugin("appearance-settings")
	.describe(metadata)
	.require(settings)
	.apply((app) => {
		app
			.use(settings)
			.page({ id: "appearance", title: "Appearance", icon: "palette", group: "sumi", order: 10, view: AppearancePage });
	});
