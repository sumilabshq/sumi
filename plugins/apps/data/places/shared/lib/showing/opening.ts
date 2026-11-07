import type { HostTab, HostTabsMoment } from "../tabs/host-tabs.js";
import { withTabPageOpened, withTabShown } from "./showing.js";
import type { Showing } from "./showing.js";
import type { TabFacts } from "./tab-facts.js";

export function withOpenedTabShown(showing: Showing, facts: TabFacts, tab: HostTab, address: string): Showing {
	return withTabShown(withTabPageOpened(showing, tab, { address, isShown: true }), facts, tab);
}

export function liveTabOf(moment: HostTabsMoment, essentialId: string): HostTab | undefined {
	return moment.tabs.find((tab) => tab.essentialId === essentialId);
}
