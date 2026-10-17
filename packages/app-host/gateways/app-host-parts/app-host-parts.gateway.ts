import type { HostTabs } from "../../shared/lib/host-tabs/host-tabs.js";
import type { TabsColumnStore } from "../../shared/lib/tabs-column/tabs-column-store.js";
import type { AppTabsGateway } from "../app-tabs/app-tabs.gateway.js";
import type { PageFactsGateway } from "../page-facts/page-facts.gateway.js";
import type { TabsColumnGateway } from "../tabs-column/tabs-column.gateway.js";

export interface AppHostParts {
	readonly appTabsGateway: AppTabsGateway;
	readonly pageFactsGateway: PageFactsGateway;
	readonly tabsColumnGateway: TabsColumnGateway;
	readonly hostTabs: HostTabs;
	readonly tabsColumnStore: TabsColumnStore;
}
