import type { ClosedTab } from "../tabs/host-tabs.js";
import type { ClosedTabRow } from "../../schema/tab-rows.schema.js";
import { tabArtOf, titleOf } from "./tab-face.js";

export function closedRowsOf(closed: readonly ClosedTab[]): readonly ClosedTabRow[] {
	return closed.flatMap(closedRowOf).reverse();
}

function closedRowOf({ tab, address }: ClosedTab): readonly ClosedTabRow[] {
	return [
		{
			tabId: tab.id,
			title: titleOf({
				app: tab.app,
				label: tab.label,
				title: tab.title,
				address,
			}),
			app: tab.app,
			address,
			icon: tabArtOf(tab.app, address),
			favicon: tab.lastFavicon,
		},
	];
}
