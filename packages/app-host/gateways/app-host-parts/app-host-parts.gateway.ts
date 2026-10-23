import type { Essentials } from "../../shared/lib/essentials/essentials.js";
import type { HostTabs } from "../../shared/lib/host-tabs/host-tabs.js";
import type { TabsColumnStore } from "../../shared/lib/tabs-column/tabs-column-store.js";
import type { ActiveChatGateway } from "../active-chat/active-chat.gateway.js";
import type { AppTabsGateway } from "../app-tabs/app-tabs.gateway.js";
import type { PageFactsGateway } from "../page-facts/page-facts.gateway.js";
import type { PaneTabsGateway } from "../pane-tabs/pane-tabs.gateway.js";
import type { TabsColumnGateway } from "../tabs-column/tabs-column.gateway.js";

export interface AppHostParts {
	readonly appTabsGateway: AppTabsGateway;
	readonly pageFactsGateway: PageFactsGateway;
	readonly tabsColumnGateway: TabsColumnGateway;
	readonly hostTabs: HostTabs;
	readonly essentials: Essentials;
	readonly activeChatGateway: ActiveChatGateway;
	readonly tabsColumnStore: TabsColumnStore;
	readonly paneTabsGateway: PaneTabsGateway;
}
