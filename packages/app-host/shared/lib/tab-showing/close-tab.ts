import type { HostTabs } from "../host-tabs/host-tabs.js";
import { showTab, shownTabIdOf } from "./show-tab.js";
import type { TabShowing } from "./show-tab.js";
import { tabPagesOf } from "./tab-pages.js";

export function closeTabs(ids: readonly string[], hostTabs: HostTabs, showing: TabShowing, reason: string): void {
	closeWith(hostTabs, showing, (pages) => hostTabs.close(ids, pages, reason));
}

export function closeGroupTabs(groupId: string, hostTabs: HostTabs, showing: TabShowing): void {
	closeWith(hostTabs, showing, (pages) => hostTabs.closeGroup(groupId, pages));
}

type TabPages = ReturnType<typeof tabPagesOf>;

function closeWith(hostTabs: HostTabs, showing: TabShowing, closing: (pages: TabPages) => void): void {
	const shownId = shownTabIdOf(hostTabs.now(), showing.appTabsGateway.shownApp());
	const pages = tabPagesOf(hostTabs.now().tabs, showing.pageFactsGateway.pages());
	const before = hostTabs.now().tabs.map((tab) => tab.id);
	closing(pages);
	const held = new Set(hostTabs.now().tabs.map((tab) => tab.id));
	showing.paneTabsGateway.closePanesOf(before.filter((id) => !held.has(id)));
	closeReleasedPages(pages, held, showing);

	if (shownId === null || held.has(shownId)) {
		return;
	}

	showNextTab(hostTabs, showing);
}

function closeReleasedPages(pages: TabPages, held: ReadonlySet<string>, showing: TabShowing): void {
	for (const [tabId, page] of pages) {
		if (!held.has(tabId)) {
			showing.pageFactsGateway.closePage(page.pageId);
		}
	}
}

function showNextTab(hostTabs: HostTabs, showing: TabShowing): void {
	const { tabs, shownId } = hostTabs.now();
	const next = tabs.find((tab) => tab.id === shownId);

	if (!next) {
		showing.appTabsGateway.closePanel();
		return;
	}

	showTab(next, tabs, showing);
}
