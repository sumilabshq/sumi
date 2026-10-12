import type { DrawnScreen } from "../../schemas/design.schema.js";

const VARIANT = /^(.+) · ([A-Z])$/;

export function pageOfScreen(name: string): string {
	return VARIANT.exec(name)?.[1] ?? name;
}

export function variantLetterOf(name: string): string | null {
	return VARIANT.exec(name)?.[2] ?? null;
}

export function screensOfPage(screens: readonly DrawnScreen[], page: string): DrawnScreen[] {
	return screens.filter((screen) => pageOfScreen(screen.name) === page);
}

export function shownVariantOf(ofPage: readonly DrawnScreen[], picked: string | undefined): DrawnScreen[] {
	if (ofPage.length < 2) return [...ofPage];
	const chosen = ofPage.find((screen) => screen.name === picked) ?? ofPage[0];
	return chosen ? [chosen] : [];
}
