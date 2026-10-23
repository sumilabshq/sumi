import type { HostTab, HostTabs, HostTabsMoment } from "../host-tabs/host-tabs.js";
import type { AppKind } from "../../schema/app-tab.schema.js";
import { ensureTabPage } from "./ensure-tab-page.js";
import type { PageMaking } from "./ensure-tab-page.js";

export interface TabShowing {
	readonly appTabsGateway: {
		shownApp(): AppKind | null;
		show(app: AppKind): void;
		closePanel(): void;
	};
	readonly pageFactsGateway: PageMaking & {
		showPage(pageId: string): void;
		closePage(pageId: string): void;
		openAddress(pageId: string, address: string): void;
	};
	readonly paneTabsGateway: {
		tabIdsInPanes(): readonly string[];
		reveal(tabId: string): void;
		closePanesOf(tabIds: readonly string[]): void;
		openShownTabPane(): void;
		closeShownTabPane(): void;
	};
}

export function shownTabIdOf({ tabs, shownId }: HostTabsMoment, shownApp: AppKind | null): string | null {
	if (shownApp === null) {
		return null;
	}

	const remembered = tabs.find((tab) => tab.id === shownId && tab.app === shownApp);
	return (remembered ?? tabs.find((tab) => tab.app === shownApp))?.id ?? null;
}

export function showTab(
	tab: HostTab,
	hostTabs: HostTabs,
	{ appTabsGateway, pageFactsGateway, paneTabsGateway }: TabShowing,
): void {
	if (paneTabsGateway.tabIdsInPanes().includes(tab.id)) {
		paneTabsGateway.reveal(tab.id);
		return;
	}

	paneTabsGateway.openShownTabPane();
	appTabsGateway.show(tab.app);
	const pageId = ensureTabPage(hostTabs, pageFactsGateway, tab.id, "shown");

	if (pageId !== null) {
		pageFactsGateway.showPage(pageId);
	}
}

export function openTabPage(tab: HostTab, address: string, showing: TabShowing): void {
	if (tab.pageId === null) {
		return;
	}

	showing.pageFactsGateway.openPage(tab.pageId);

	if (address !== "") {
		showing.pageFactsGateway.openAddress(tab.pageId, address);
	}
}

export function showFreeTabBesidePanes(hostTabs: HostTabs, showing: TabShowing): void {
	const inPanes = showing.paneTabsGateway.tabIdsInPanes();
	const shownId = shownTabIdOf(hostTabs.now(), showing.appTabsGateway.shownApp());

	if (shownId === null || !inPanes.includes(shownId)) {
		return;
	}

	const free = hostTabs.now().tabs.find((tab) => !inPanes.includes(tab.id));
	console.info(`[widgetarium] shown tab ${shownId} → ${free?.id ?? "none"} (${shownId} stands in its own pane now)`);

	if (!free) {
		showing.paneTabsGateway.closeShownTabPane();
		return;
	}

	hostTabs.show(free.id);
	showTab(free, hostTabs, showing);
}
