import type { HostTab, HostTabsMoment } from "../host-tabs/host-tabs.js";
import type { AppKind } from "../../schema/app-tab.schema.js";
import type { PageFacts } from "../../schema/page-facts.schema.js";
import { tabPagesOf } from "./tab-pages.js";

export interface TabShowing {
	readonly appTabsGateway: {
		shownApp(): AppKind | null;
		show(app: AppKind): void;
		closePanel(): void;
	};
	readonly pageFactsGateway: {
		pages(): readonly PageFacts[];
		showPage(pageId: string): void;
		openPage(pageId: string): void;
		closePage(pageId: string): void;
		openAddress(pageId: string, address: string): void;
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
	tabs: readonly HostTab[],
	{ appTabsGateway, pageFactsGateway }: TabShowing,
): void {
	appTabsGateway.show(tab.app);
	const page = tabPagesOf(tabs, pageFactsGateway.pages()).get(tab.id);

	if (page) {
		pageFactsGateway.showPage(page.pageId);
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
