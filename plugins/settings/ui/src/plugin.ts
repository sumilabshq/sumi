import { apps } from "@sumi/apps-plugin";
import { settingsRegistry } from "@sumi/settings-registry-plugin";
import { shell } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import metadata from "../metadata.json" with { type: "json" };
import { settingsTabPage } from "./features/settings/lib/settings-tab-page.js";
import { SETTINGS_ICON } from "./shared/lib/settings-icon.js";
import { windowAppProviderOf } from "./shared/ui/window-app-provider/window-app-provider.js";

export const settingsUi = plugin("settings-ui")
	.describe(metadata)
	.require(apps, shell, settingsRegistry)
	.apply((app) => {
		const registry = app.use(settingsRegistry);
		app.use(apps).app({ id: "settings", title: "Settings", icon: SETTINGS_ICON });
		app.use(shell).tabPage(settingsTabPage(registry.pages(), registry.pageImports()));
		app.use(shell).provider(windowAppProviderOf);
	});
