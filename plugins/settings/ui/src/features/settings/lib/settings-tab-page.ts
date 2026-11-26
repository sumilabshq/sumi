import type { RemoteModule } from "@widgetarium/data-framework";
import type { SettingsPageEntry } from "@sumi/settings-registry-plugin";
import type { DrawnTabPage, WindowOffers } from "@sumi/sumi-host-plugin";
import { settingsRootOf } from "../ui/settings-root/settings-root.js";

const SETTINGS_APP = "settings";

export function settingsTabPage(
	pages: readonly SettingsPageEntry[],
	imports: readonly ((offers: WindowOffers) => RemoteModule)[],
): DrawnTabPage {
	return {
		page: settingsRootOf(pages),
		header: "shell",
		draws: (app) => app === SETTINGS_APP,
		modulesOf: (_tab, offers) => Promise.resolve({ modules: [], imports: imports.map((build) => build(offers)) }),
	};
}
