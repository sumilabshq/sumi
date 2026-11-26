import type { SettingsPageEntry, SettingsPageGroup } from "@sumi/settings-registry-plugin";

function isMatch(page: SettingsPageEntry, needle: string): boolean {
	return [page.title, ...(page.keywords ?? [])].some((word) => word.toLowerCase().includes(needle));
}

export function groupsMatching(groups: readonly SettingsPageGroup[], query: string): readonly SettingsPageGroup[] {
	const needle = query.trim().toLowerCase();

	if (needle === "") {
		return groups;
	}

	return groups
		.map((group) => ({ ...group, pages: group.pages.filter((page) => isMatch(page, needle)) }))
		.filter((group) => group.pages.length > 0);
}
