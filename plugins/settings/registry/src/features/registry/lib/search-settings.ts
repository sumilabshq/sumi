import type { SettingsPageEntry, SettingsSectionEntry } from "../../../shared/lib/settings-page-entry.js";

export interface SettingsHit {
	readonly kind: "page" | "section";
	readonly pageId: string;
	readonly sectionPath: readonly string[];
	readonly title: string;
	readonly trail: readonly string[];
	readonly matchedIn: "title" | "keywords" | "description";
}

interface Candidate {
	readonly kind: SettingsHit["kind"];
	readonly pageId: string;
	readonly sectionPath: readonly string[];
	readonly trail: readonly string[];
	readonly entry: SettingsPageEntry | SettingsSectionEntry;
}

interface Match {
	readonly matchedIn: SettingsHit["matchedIn"];
	readonly rank: number;
}

// TODO: swappable search algorithm
export function searchSettings(pages: readonly SettingsPageEntry[], query: string): readonly SettingsHit[] {
	const needle = query.trim().toLowerCase();

	if (needle === "") {
		return [];
	}

	return candidatesOf(pages)
		.flatMap((candidate) => {
			const match = matchOf(candidate.entry, needle);
			return match === null ? [] : [{ candidate, match }];
		})
		.sort(
			(left, right) =>
				left.match.rank - right.match.rank ||
				Number(left.candidate.kind === "section") - Number(right.candidate.kind === "section"),
		)
		.map(({ candidate, match }) => ({
			kind: candidate.kind,
			pageId: candidate.pageId,
			sectionPath: candidate.sectionPath,
			title: candidate.entry.title,
			trail: candidate.trail,
			matchedIn: match.matchedIn,
		}));
}

function matchOf(entry: SettingsPageEntry | SettingsSectionEntry, needle: string): Match | null {
	const title = entry.title.toLowerCase();

	if (title.startsWith(needle)) {
		return { matchedIn: "title", rank: 0 };
	}

	if (title.includes(needle)) {
		return { matchedIn: "title", rank: 1 };
	}

	if ((entry.keywords ?? []).some((word) => word.toLowerCase().includes(needle))) {
		return { matchedIn: "keywords", rank: 2 };
	}

	return (entry.description ?? "").toLowerCase().includes(needle) ? { matchedIn: "description", rank: 3 } : null;
}

function candidatesOf(pages: readonly SettingsPageEntry[]): readonly Candidate[] {
	return [...pages]
		.sort((left, right) => left.order - right.order)
		.flatMap((page) => [
			{ kind: "page" as const, pageId: page.id, sectionPath: [], trail: [], entry: page },
			...sectionCandidatesOf(page, page.sections ?? [], [], [page.title]),
		]);
}

function sectionCandidatesOf(
	page: SettingsPageEntry,
	sections: readonly SettingsSectionEntry[],
	path: readonly string[],
	trail: readonly string[],
): readonly Candidate[] {
	return sections.flatMap((section) => {
		const sectionPath = [...path, section.id];
		return [
			{ kind: "section" as const, pageId: page.id, sectionPath, trail, entry: section },
			...sectionCandidatesOf(page, section.sections ?? [], sectionPath, [...trail, section.title]),
		];
	});
}
