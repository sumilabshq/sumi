import type { DrawnScreen, StatePicture } from "../../schema/design.js";
import type { PagesNow } from "../pages/pages-now.js";

export interface ShownScreen {
	readonly screen: DrawnScreen;
	readonly picture: StatePicture | null;
	readonly key: string;
}

export function pictureWidgetsShownOf({ pages, design }: PagesNow): string[] {
	const shown = design.screens.filter((screen) => pages.shownScreens.includes(screen.name));
	return shown.flatMap((screen) => screen.states.flatMap((state) => (state.picture ? [state.picture.widget] : [])));
}

export function shownScreenOf({ pages, design }: PagesNow): ShownScreen | null {
	const screen = design.screens.find((one) => one.name === pages.shownScreen);
	if (!screen) return null;
	const picture = screen.states[0]?.picture ?? null;
	return { screen, picture, key: picture?.widget ?? screen.name };
}
