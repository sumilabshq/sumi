import type { CanvasPages } from "../../../shared/lib/pages/canvas-pages.js";

const PICKED = "Picked";

export interface VariantsShown {
	readonly isShown: boolean;
	readonly shown: string;
	readonly items: { readonly value: string; readonly label: string }[];
}

export function variantsOf(pages: CanvasPages): VariantsShown {
	return {
		isShown: pages.variants.length >= 2,
		shown: pages.shownScreen ?? "",
		items: pages.variants.map(({ screen, letter }) => ({
			value: screen,
			label: letter ?? PICKED,
		})),
	};
}
