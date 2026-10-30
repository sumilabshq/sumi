import type { ClosedTab } from "../tabs/host-tabs.js";
import type { ClosedTabRow } from "../../schema/tab-rows.schema.js";
import { APP_LABELS } from "./app-labels.js";
import { hostOf } from "./tab-art-of.js";

export function closedRowsOf(closed: readonly ClosedTab[]): readonly ClosedTabRow[] {
	return closed.flatMap(closedRowOf).reverse();
}

function closedRowOf({ tab, address }: ClosedTab): readonly ClosedTabRow[] {
	return [
		{
			tabId: tab.id,
			title: tab.label ?? tab.title ?? hostOf(address) ?? APP_LABELS[tab.app],
			app: tab.app,
			address,
		},
	];
}
