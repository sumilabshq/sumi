import type { SettingsPage } from "../../../shared/lib/settings-page.js";

export interface PageGroup {
	readonly label: string | null;
	readonly pages: readonly SettingsPage[];
}

const EXTEND_LABEL = "Extend Sumi";

function ordered(pages: readonly SettingsPage[], group: SettingsPage["group"]): readonly SettingsPage[] {
	return pages.filter((page) => page.group === group).sort((left, right) => left.order - right.order);
}

export function pagesByGroup(pages: readonly SettingsPage[]): readonly PageGroup[] {
	return [
		{ label: null, pages: ordered(pages, "sumi") },
		{ label: EXTEND_LABEL, pages: ordered(pages, "extend") },
	].filter((group) => group.pages.length > 0);
}
