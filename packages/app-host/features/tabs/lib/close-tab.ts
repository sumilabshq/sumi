import type { HostTabs } from "../../../shared/lib/host-tabs/host-tabs.js";
import { showTab } from "./show-tab.js";
import type { TabShowing } from "./show-tab.js";
import { shownTabIdOf } from "./tab-rows.js";

export function closeTab(id: string, hostTabs: HostTabs, showing: TabShowing): void {
	const wasShown = shownTabIdOf(hostTabs.now(), showing.appTabsGateway.shownApp()) === id;
	hostTabs.close(id);

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
