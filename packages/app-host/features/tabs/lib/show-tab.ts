import type { HostTab } from "../../../shared/lib/host-tabs/host-tabs.js";
import type { AppTabsGateway } from "../../../gateways/app-tabs/app-tabs.gateway.js";
import type { PageFactsGateway } from "../../../gateways/page-facts/page-facts.gateway.js";
import { pagesOfTabs } from "./tab-pages.js";

export interface TabShowing {
	readonly appTabsGateway: AppTabsGateway;
	readonly pageFactsGateway: PageFactsGateway;
}

export function showTab(
	tab: HostTab,
	tabs: readonly HostTab[],
	{ appTabsGateway, pageFactsGateway }: TabShowing,
): void {
	appTabsGateway.show(tab.app);
	const page = pagesOfTabs(tabs, pageFactsGateway.pages()).get(tab.id);

	if (page) {
		pageFactsGateway.showPage(page.pageId);
	}
}
