import type { DrawnScreen } from "../../schema/drawn-design.schema.js";
import type { StatePicture } from "../../schema/state-picture.schema.js";
import type { PagesNow } from "../pages/pages-now.js";

export interface ShownScreen {
	readonly screen: DrawnScreen;
	readonly picture: StatePicture | null;
	readonly key: string;
}

type ShownPages = Pick<PagesNow, "pages" | "design">;

export function screensShownOf({ pages, design }: ShownPages): DrawnScreen[] {
	return design.screens.filter((screen) => pages.shownScreens.includes(screen.name));
}

export function pictureWidgetsShownOf(now: PagesNow): string[] {
	return screensShownOf(now).flatMap((screen) =>
		screen.states.flatMap((state) => (state.picture ? [state.picture.widget] : [])),
	);
}

export function shownScreenOf({ pages, design }: ShownPages): ShownScreen | null {
	const screen = design.screens.find((one) => one.name === pages.shownScreen);

	if (!screen) {
		return null;
	}

	const picture = screen.states[0]?.picture ?? null;
	return {
		screen,
		picture,
		key: picture?.widget ?? screen.name,
	};
}
