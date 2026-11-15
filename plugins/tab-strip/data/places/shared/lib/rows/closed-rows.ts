import type { ClosedTab } from "../tabs/host-tabs.js";
import type { ClosedTabRow } from "../../schema/tab-rows.schema.js";
import { tabArtOf, titleOf } from "./tab-face.js";
import type { PlacedApps } from "../tabs/app-abilities.js";

export function closedRowsOf(apps: PlacedApps, closed: readonly ClosedTab[]): readonly ClosedTabRow[] {
	return closed.flatMap((one) => closedRowOf(apps, one)).reverse();
}

function closedRowOf(apps: PlacedApps, { tab, address }: ClosedTab): readonly ClosedTabRow[] {
	return [
		{
			tabId: tab.id,
			title: titleOf(apps, {
				app: tab.app,
				label: tab.label,
				title: tab.title,
				address,
			}),
			app: tab.app,
			address,
			icon: tabArtOf(apps, tab.app, address),
			favicon: null,
		},
	];
}
