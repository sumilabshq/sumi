import { shell } from "@sumi/sumi-host-plugin";
import type { DrawnTabPage, WindowOffers } from "@sumi/sumi-host-plugin";
import type { RemoteModule } from "@widgetarium/data-framework";
import { plugin } from "@widgetarium/plugin-framework";
import metadata from "../metadata.json" with { type: "json" };
import { repeatedSectionId } from "./features/registry/lib/section-tree.js";
import type { SettingsPageEntry } from "./shared/lib/settings-page-entry.js";

export type SettingsPageImport = (offers: WindowOffers) => RemoteModule;
export type SettingsTabPageOf = (
	pages: readonly SettingsPageEntry[],
	imports: readonly SettingsPageImport[],
) => DrawnTabPage;

export const settingsRegistry = plugin("settings-registry")
	.describe(metadata)
	.require(shell)
	.apply((app) => {
		const pages: SettingsPageEntry[] = [];
		const imports: SettingsPageImport[] = [];
		return {
			addPage: (page: SettingsPageEntry): void => {
				const repeated = repeatedSectionId(page);

				if (repeated !== undefined) {
					throw new Error(`settings page "${page.id}" has section id "${repeated}" more than once`);
				}

				pages.push(page);
			},
			addPageImport: (build: SettingsPageImport): void => {
				imports.push(build);
			},
			addTabPage: (tabPageOf: SettingsTabPageOf): void => {
				app.use(shell).tabPage(tabPageOf(pages, imports));
			},
		};
	});
