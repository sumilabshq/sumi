import type { SettingsPageEntry, SettingsPageImport } from "@sumi/settings-registry-plugin";
import type { DrawnTabPage } from "@sumi/sumi-host-plugin";
import { settingsRootOf } from "../ui/settings-root/settings-root.js";

const SETTINGS_APP = "settings";

export function settingsTabPage(
	pages: readonly SettingsPageEntry[],
	imports: readonly SettingsPageImport[],
): DrawnTabPage {
	return {
		page: settingsRootOf(pages),
		header: "shell",
		draws: (app) => app === SETTINGS_APP,
		modulesOf: (_tab, offers) => Promise.resolve({ modules: [], imports: imports.map((build) => build(offers)) }),
	};
}
