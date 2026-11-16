import type { HomePageFace } from "../schema/home-pages.schema.js";

export type HomePageVerdict = { readonly isAllowed: true } | { readonly isAllowed: false; readonly reason: string };

const NO_SUCH_PAGE = "no home page {id}; installed: {installed}";

export function shownHomePageOf(kept: string | null, pages: readonly HomePageFace[]): string | null {
	if (kept !== null && pages.some(({ id }) => id === kept)) {
		return kept;
	}

	// TRADE-OFF: with nothing kept, the first home page installed is shown; plugin order picks the default
	return pages[0]?.id ?? null;
}

export function homePageVerdictOf(id: string, pages: readonly HomePageFace[]): HomePageVerdict {
	if (pages.some((page) => page.id === id)) {
		return { isAllowed: true };
	}

	return {
		isAllowed: false,
		reason: NO_SUCH_PAGE.replace("{id}", id).replace("{installed}", pages.map((page) => page.id).join(", ")),
	};
}
