import { apps } from "@sumi/apps-plugin";
import { shell } from "@sumi/sumi-host-plugin";
import type { RemoteModule } from "@widgetarium/data-framework";
import { plugin } from "@widgetarium/plugin-framework";
import metadata from "../metadata.json" with { type: "json" };
import type { WindowOffers } from "@sumi/sumi-host-plugin";
import { settingsTabPage } from "./features/settings/lib/settings-tab-page.js";
import { SETTINGS_ICON } from "./shared/lib/settings-icon.js";
import type { SettingsPage } from "./shared/lib/settings-page.js";
import { windowAppProviderOf } from "./shared/ui/window-app-provider/window-app-provider.js";

export const settings = plugin("settings")
	.describe(metadata)
	.require(apps, shell)
	.apply((app) => {
		const pages: SettingsPage[] = [];
		const imports: ((offers: WindowOffers) => RemoteModule)[] = [];
		app.use(apps).app({ id: "settings", title: "Settings", icon: SETTINGS_ICON });
		app.use(shell).tabPage(settingsTabPage(pages, imports));
		app.use(shell).provider(windowAppProviderOf);
		return {
			pageImport: (build: (offers: WindowOffers) => RemoteModule): void => {
				imports.push(build);
			},
			page: (page: SettingsPage): void => {
				pages.push(page);
			},
		};
	});
