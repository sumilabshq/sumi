import type { TabModules, TabPageProps, WindowOffers } from "@sumi/sumi-host-plugin";
import { AssistantModule } from "@widgetarium/assistant";
import { MascotModule } from "@widgetarium/mascot/module";
import { TasksModule } from "@widgetarium/tasks";

export function chatModulesOf(_tab: TabPageProps, offers: WindowOffers): Promise<TabModules> {
	return Promise.resolve({
		modules: [MascotModule],
		imports: [TasksModule({ over: offers.core }), AssistantModule({ over: offers.windowServer })],
	});
}
