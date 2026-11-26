import type { SettingsPageEntry, SettingsSectionEntry } from "../../../shared/lib/settings-page-entry.js";

function flatSections(sections: readonly SettingsSectionEntry[] | undefined): readonly SettingsSectionEntry[] {
	return (sections ?? []).flatMap((section) => [section, ...flatSections(section.sections)]);
}

export function findSection(page: SettingsPageEntry, id: string): SettingsSectionEntry | undefined {
	return flatSections(page.sections).find((section) => section.id === id);
}

export function repeatedSectionId(page: SettingsPageEntry): string | undefined {
	const ids = flatSections(page.sections).map((section) => section.id);
	return ids.find((id, at) => ids.indexOf(id) !== at);
}
