import type { RemoteModule } from "@widgetarium/data-framework";
import type { DrawnTabPage, WindowOffers } from "@sumi/sumi-host-plugin";
import type { SettingsPage } from "../../../shared/lib/settings-page.js";
import { settingsPageOf } from "../ui/settings-page/settings-page.js";

const SETTINGS_APP = "settings";

export function settingsTabPage(
	pages: readonly SettingsPage[],
	imports: readonly ((offers: WindowOffers) => RemoteModule)[],
): DrawnTabPage {
	return {
		page: settingsPageOf(pages),
		header: "shell",
		draws: (app) => app === SETTINGS_APP,
		modulesOf: (_tab, offers) => Promise.resolve({ modules: [], imports: imports.map((build) => build(offers)) }),
	};
}
