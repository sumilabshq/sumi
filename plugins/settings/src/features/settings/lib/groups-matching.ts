import type { SettingsPage } from "../../../shared/lib/settings-page.js";
import type { PageGroup } from "./pages-by-group.js";

function isMatch(page: SettingsPage, needle: string): boolean {
	return [page.title, ...(page.keywords ?? [])].some((word) => word.toLowerCase().includes(needle));
}

export function groupsMatching(groups: readonly PageGroup[], query: string): readonly PageGroup[] {
	const needle = query.trim().toLowerCase();

	if (needle === "") {
		return groups;
	}

	return groups
		.map((group) => ({ ...group, pages: group.pages.filter((page) => isMatch(page, needle)) }))
		.filter((group) => group.pages.length > 0);
}
