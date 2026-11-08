import type { TabModules, TabPageProps, WindowOffers } from "@sumi/sumi-host-plugin";
import { assistant } from "@widgetarium/assistant/contract";
import { mascot } from "@widgetarium/mascot/implementation";
import { tasks } from "@widgetarium/tasks/contract";

export function chatModulesOf(_tab: TabPageProps, offers: WindowOffers): Promise<TabModules> {
	return Promise.resolve({
		modules: [mascot],
		imports: [tasks({ over: offers.core }), assistant({ over: offers.windowServer })],
	});
}
