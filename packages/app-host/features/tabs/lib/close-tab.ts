import type { HostTabs } from "../../../shared/lib/host-tabs/host-tabs.js";
import { showTab } from "./show-tab.js";
import type { TabShowing } from "./show-tab.js";
import { tabPagesOf } from "./tab-pages.js";
import { shownTabIdOf } from "./tab-rows.js";

export function closeTab(id: string, hostTabs: HostTabs, showing: TabShowing): void {
	const wasShown = shownTabIdOf(hostTabs.now(), showing.appTabsGateway.shownApp()) === id;
	const page = tabPagesOf(hostTabs.now().tabs, showing.pageFactsGateway.pages()).get(id) ?? null;
	hostTabs.close(id, page);

	if (page) {
		showing.pageFactsGateway.closePage(page.pageId);
	}

	if (!wasShown) {
		return;
	}

	const { tabs, shownId } = hostTabs.now();
	const next = tabs.find((tab) => tab.id === shownId);

	if (!next) {
		showing.appTabsGateway.closePanel();
		return;
	}

	showTab(next, tabs, showing);
}

export function closeOtherTabs(keptId: string, hostTabs: HostTabs, showing: TabShowing): void {
	const pages = tabPagesOf(hostTabs.now().tabs, showing.pageFactsGateway.pages());
	hostTabs.closeOthers(keptId, pages);
	const held = new Set(hostTabs.now().tabs.map((tab) => tab.id));

	for (const [tabId, page] of pages) {
		if (!held.has(tabId)) {
			showing.pageFactsGateway.closePage(page.pageId);
		}
	}
}
