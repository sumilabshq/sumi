import type { PlacedApp } from "@widgetarium/places/implementation";
import type { TabRules } from "./app-types.js";
import type { FilledApp } from "../ui/app-tab/app-tab.js";

type AppAbilities = PlacedApp["abilities"];

const PAGE_APP_ABILITIES: AppAbilities = {
	isChat: false,
	navigates: false,
	splits: false,
	runsInPage: true,
	keepsRecord: false,
};

export function placedAppOf(app: FilledApp): PlacedApp {
	return {
		id: app.id,
		title: app.title,
		newTabTitle: app.newTabTitle ?? null,
		art: app.art ?? null,
		artOf: app.artOf ?? null,
		handoffAppOf: app.handoffAppOf ?? null,
		abilities: {
			...PAGE_APP_ABILITIES,
			...declaredRulesOf(app.tabs),
		},
	};
}

function declaredRulesOf(tabs: TabRules | undefined): Partial<AppAbilities> {
	return Object.fromEntries(Object.entries(tabs ?? {}).filter(([, rule]) => rule !== undefined));
}
