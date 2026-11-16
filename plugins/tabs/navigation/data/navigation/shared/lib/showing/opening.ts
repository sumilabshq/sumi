import type { HostTab } from "../tabs/host-tabs.js";
import { withTabPageOpened } from "./showing.js";
import type { Showing } from "./showing.js";
import type { TabFacts } from "./tab-facts.js";
import { withShownTab } from "./tab-shown.js";

export function withOpenedTabShown(showing: Showing, facts: TabFacts, tab: HostTab, address: string): Showing {
	return withShownTab(withTabPageOpened(showing, tab, { address, isShown: true }), facts, {
		tab,
		paneId: null,
	});
}
