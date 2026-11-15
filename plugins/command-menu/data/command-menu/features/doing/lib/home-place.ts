import type { HomePlace, Intent, Where } from "../../../shared/schema/command-menu.schema.js";

export function whereOf(intent: Intent): Where | null {
	if (intent.do === "open-address" || intent.do === "open-link") {
		return intent.where;
	}

	return null;
}

export function homePlaceOf(intent: Intent, asked: HomePlace): HomePlace {
	if (asked !== "here") {
		return asked;
	}

	const where = whereOf(intent);

	if (where === null || where === "this-tab") {
		return "here";
	}

	return where;
}

export function openedInNewTab(intent: Intent): Intent {
	if (intent.do === "open-address" || intent.do === "open-link") {
		return {
			...intent,
			where: "new-tab",
		};
	}

	return intent;
}
