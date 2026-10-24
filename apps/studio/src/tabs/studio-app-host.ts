import { studioAppHostParts } from "@widgetarium/app-host/gateways";
import type { AppHostParts, StudioAppHost, TabsSessionGateway } from "@widgetarium/app-host/gateways";
import type { BrowserParts } from "@widgetarium/browser/gateways";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import type { LayoutParts } from "@widgetarium/layout/gateways";
import { BrowserAppPageFactsGateway } from "./browser-page-facts.gateway.js";
import { LayoutPaneTabsGateway } from "./layout-pane-tabs.gateway.js";

export interface StudioAppHostAsk {
	readonly state: StudioState;
	readonly browser: BrowserParts;
	readonly layout: LayoutParts;
	readonly workspace: string;
	// TODO: drop studio, no reader since the app picker left
	readonly studio: StudioHostPort;
	readonly kept?: Pick<StudioAppHost, "tabsColumnGateway" | "tabsSessionGateway" | "essentialsGateway" | "activeChat">;
}

export function startedAppHostParts({ state, browser, layout, workspace, kept = {} }: StudioAppHostAsk): AppHostParts {
	layout.paneTreeStore.dropGoneTabs(new Set(keptTabIdsOf(kept.tabsSessionGateway)));
	return studioAppHostParts({
		...kept,
		studioState: state,
		workspace,
		pageFactsGateway: new BrowserAppPageFactsGateway(browser),
		paneTabsGateway: new LayoutPaneTabsGateway(layout.paneTreeStore),
	});
}

function keptTabIdsOf(tabsSessionGateway: TabsSessionGateway | undefined): string[] {
	return tabsSessionGateway?.kept()?.tabs.map(({ id }) => id) ?? [];
}
