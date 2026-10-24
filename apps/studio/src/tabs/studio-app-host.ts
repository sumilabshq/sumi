import { studioAppHostParts } from "@widgetarium/app-host/gateways";
import type { AppHostParts, StudioAppHost, TabsSessionGateway } from "@widgetarium/app-host/gateways";
import type { BrowserParts } from "@widgetarium/browser/gateways";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import type { StartedApp } from "@widgetarium/core/requests";
import { DropGoneTabsCommand } from "@widgetarium/layout";
import { BrowserAppPageFactsGateway } from "./browser-page-facts.gateway.js";
import { LayoutPaneTabsGateway, reportRefused } from "./layout-pane-tabs.gateway.js";

export interface StudioAppHostAsk {
	readonly state: StudioState;
	readonly browser: BrowserParts;
	readonly layoutApp: StartedApp;
	readonly workspace: string;
	// TODO: drop studio, no reader since the app picker left
	readonly studio: StudioHostPort;
	readonly kept?: Pick<StudioAppHost, "tabsColumnGateway" | "tabsSessionGateway" | "essentialsGateway" | "activeChat">;
}

export function startedAppHostParts({
	state,
	browser,
	layoutApp,
	workspace,
	kept = {},
}: StudioAppHostAsk): AppHostParts {
	const heldTabIds = keptTabIdsOf(kept.tabsSessionGateway);
	void reportRefused("drop the panes of gone tabs", layoutApp.send(DropGoneTabsCommand, { heldTabIds }));
	return studioAppHostParts({
		...kept,
		studioState: state,
		workspace,
		pageFactsGateway: new BrowserAppPageFactsGateway(browser),
		paneTabsGateway: new LayoutPaneTabsGateway(layoutApp),
	});
}

function keptTabIdsOf(tabsSessionGateway: TabsSessionGateway | undefined): string[] {
	return tabsSessionGateway?.kept()?.tabs.map(({ id }) => id) ?? [];
}
