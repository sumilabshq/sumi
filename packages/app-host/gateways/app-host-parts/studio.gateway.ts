import type { StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import { NO_STUDIO_HOST } from "@widgetarium/core/engine/studio-host.js";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import { HostTabs } from "../../shared/lib/host-tabs/host-tabs.js";
import type { OpenedTab } from "../../shared/lib/host-tabs/host-tabs.js";
import { COLUMN_OPENED_ON } from "../../shared/lib/tabs-column/column-look.js";
import { TabsColumnStore } from "../../shared/lib/tabs-column/tabs-column-store.js";
import { StudioStateAppTabsGateway } from "../app-tabs/studio-state.gateway.js";
import { StudioHostAppsGateway } from "../host-apps/studio-host.gateway.js";
import { NoPageFactsGateway } from "../page-facts/none.gateway.js";
import type { PageFactsGateway } from "../page-facts/page-facts.gateway.js";
import { LocalStorageTabsColumnGateway } from "../tabs-column/local-storage.gateway.js";
import type { AppHostParts } from "./app-host-parts.gateway.js";

const FIRST_TABS: readonly OpenedTab[] = [
	{
		app: "canvas",
		pageId: null,
		isPinned: true,
	},
	{
		app: "browser",
		pageId: null,
		isPinned: true,
	},
];

export interface StudioAppHost {
	readonly studioState: StudioState;
	readonly workspace: string;
	readonly pageFactsGateway?: PageFactsGateway;
	readonly studioHost?: StudioHostPort;
}

export function studioAppHostParts({
	studioState,
	workspace,
	pageFactsGateway = new NoPageFactsGateway(),
	studioHost = NO_STUDIO_HOST,
}: StudioAppHost): AppHostParts {
	const appTabsGateway = new StudioStateAppTabsGateway(studioState);
	const tabsColumnGateway = new LocalStorageTabsColumnGateway(workspace);
	const hostTabs = new HostTabs(FIRST_TABS);
	const shownApp = appTabsGateway.shownApp();
	const shownFirst = hostTabs.now().tabs.find((tab) => tab.app === shownApp);

	if (shownFirst) {
		hostTabs.show(shownFirst.id);
	}

	return {
		appTabsGateway,
		pageFactsGateway,
		hostAppsGateway: new StudioHostAppsGateway(studioHost),
		tabsColumnGateway,
		hostTabs,
		tabsColumnStore: new TabsColumnStore(tabsColumnGateway.kept() ?? COLUMN_OPENED_ON),
	};
}
