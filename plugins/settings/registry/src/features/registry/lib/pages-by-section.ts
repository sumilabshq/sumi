import type { SettingsPageEntry } from "../../../shared/lib/settings-page-entry.js";

export interface SettingsPageGroup {
	readonly label: string | null;
	readonly pages: readonly SettingsPageEntry[];
}

const UNLABELLED_SECTION = "Sumi";

export function pagesBySection(pages: readonly SettingsPageEntry[]): readonly SettingsPageGroup[] {
	const names = [...new Set(pages.map((page) => page.section))].sort(
		(left, right) => Number(right === UNLABELLED_SECTION) - Number(left === UNLABELLED_SECTION),
	);
	return names.map((name) => ({
		label: name === UNLABELLED_SECTION ? null : name,
		pages: pages.filter((page) => page.section === name).sort((left, right) => left.order - right.order),
	}));
}
