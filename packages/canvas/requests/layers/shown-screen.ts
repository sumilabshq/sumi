import type { DrawnScreen, StatePicture } from "../../schema/design.js";
import type { PagesNow } from "../pages/pages-now.js";

export interface ShownScreen {
	readonly screen: DrawnScreen;
	readonly picture: StatePicture | null;
	readonly key: string;
}

export function shownScreenOf({ pages, design }: PagesNow): ShownScreen | null {
	const screen = design.screens.find((one) => one.name === pages.shownScreen);
	if (!screen) return null;
	const picture = screen.states[0]?.picture ?? null;
	return { screen, picture, key: picture?.widget ?? screen.name };
}
