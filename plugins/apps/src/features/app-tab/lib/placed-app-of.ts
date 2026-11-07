import type { PlacedApp } from "@widgetarium/places/module";
import type { FilledApp } from "../ui/app-tab/app-tab.js";

export function placedAppOf({ id, title, art, artOf, newTabTitle, tabs }: FilledApp): PlacedApp {
	return {
		id,
		title,
		newTabTitle: newTabTitle ?? null,
		art: art ?? null,
		artOf: artOf ?? null,
		abilities: {
			holdsTabs: tabs?.holdsTabs ?? false,
			navigates: tabs?.navigates ?? false,
			splits: tabs?.splits ?? false,
			runsInPage: tabs?.runsInPage ?? true,
			keepsRecord: tabs?.keepsRecord ?? false,
		},
	};
}
