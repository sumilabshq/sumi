import type { WindowOffers } from "@sumi/sumi-host-plugin";
import type { RemoteModule } from "@widgetarium/data-framework";
import { plugin } from "@widgetarium/plugin-framework";
import metadata from "../metadata.json" with { type: "json" };
import { repeatedSectionId } from "./features/registry/lib/section-tree.js";
import type { SettingsPageEntry } from "./shared/lib/settings-page-entry.js";

export const settingsRegistry = plugin("settings-registry")
	.describe(metadata)
	.apply(() => {
		const pages: SettingsPageEntry[] = [];
		const imports: ((offers: WindowOffers) => RemoteModule)[] = [];
		return {
			page: (page: SettingsPageEntry): void => {
				const repeated = repeatedSectionId(page);

				if (repeated !== undefined) {
					throw new Error(`settings page "${page.id}" has section id "${repeated}" more than once`);
				}

				pages.push(page);
			},
			pageImport: (build: (offers: WindowOffers) => RemoteModule): void => {
				imports.push(build);
			},
			pages: (): readonly SettingsPageEntry[] => pages,
			pageImports: (): readonly ((offers: WindowOffers) => RemoteModule)[] => imports,
		};
	});
