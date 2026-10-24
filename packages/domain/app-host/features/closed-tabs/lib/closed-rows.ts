import { APP_LABELS } from "../../../shared/lib/app-labels.js";
import { hostOf } from "../../../shared/lib/tab-art/tab-art-of.js";
import type { ClosedTabRow } from "../../../shared/schema/closed-tab.schema.js";
import type { KeptTabs } from "../../../shared/schema/tabs-session.schema.js";

export function closedRowsOf(closed: KeptTabs["closed"]): readonly ClosedTabRow[] {
	return closed
		.map(({ tab, address }) => ({
			tabId: tab.id,
			title: tab.label ?? hostOf(address) ?? APP_LABELS[tab.app],
			app: tab.app,
			address,
		}))
		.reverse();
}
