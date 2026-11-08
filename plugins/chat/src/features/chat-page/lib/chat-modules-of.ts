import type { TabModules, TabPageProps, WindowOffers } from "@sumi/sumi-host-plugin";
import { assistant } from "@widgetarium/assistant";
import { mascot } from "@widgetarium/mascot/module";
import { tasks } from "@widgetarium/tasks";

export function chatModulesOf(_tab: TabPageProps, offers: WindowOffers): Promise<TabModules> {
	return Promise.resolve({
		modules: [mascot],
		imports: [tasks({ over: offers.core }), assistant({ over: offers.windowServer })],
	});
}
