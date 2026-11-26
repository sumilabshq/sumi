import { searchSettings } from "@sumi/settings-registry-plugin";
import type { SettingsHit, SettingsPageEntry } from "@sumi/settings-registry-plugin";

export interface HitRow {
	readonly hit: SettingsHit;
	readonly page: SettingsPageEntry;
}

export function hitRowsOf(pages: readonly SettingsPageEntry[], query: string): readonly HitRow[] {
	return searchSettings(pages, query).flatMap((hit) => {
		const page = pages.find(({ id }) => id === hit.pageId);
		return page === undefined ? [] : [{ hit, page }];
	});
}
