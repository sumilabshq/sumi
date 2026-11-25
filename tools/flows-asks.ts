import type { PlacedApp } from "../plugins/tabs/navigation/data/navigation/shared/host/places.host.ts";
import type { Screen } from "../plugins/tabs/navigation/data/navigation/shared/schema/screen.schema.ts";
import { BARE_SCREEN } from "./places-fixture.ts";

export const BROWSER_SCREEN: Screen = { ...BARE_SCREEN, isBrowserAvailable: true };

export const WEB_APP: PlacedApp = {
	id: "web",
	title: "Web",
	newTabTitle: null,
	art: null,
	artOf: null,
	handoffAppOf: null,
	abilities: { isChat: false, navigates: true, splits: false, runsInPage: true, keepsRecord: false },
};

export function atOf(
	window: string,
	screen: Screen = BARE_SCREEN,
): { readonly window: string; readonly screen: Screen } {
	return { window, screen };
}
