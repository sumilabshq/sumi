import type { CanvasPages } from "./canvas-pages.js";

export interface PageChoices {
	readonly shown: string;
	readonly groups: readonly (readonly string[])[];
}

export function pageChoicesOf({ leading, screens, trailing, shown }: CanvasPages): PageChoices {
	return {
		shown,
		groups: [leading, screens, trailing].filter((group) => group.length > 0),
	};
}
