import { SharedModulesSlot, SumiHostPlugin } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { PlacesModule } from "@widgetarium/places/module";
import { QuestionsModule } from "@widgetarium/questions/module";
import { TasksModule } from "@widgetarium/tasks/module";

export const MainPlugin = plugin("main")
	.require(SumiHostPlugin)
	.fill(
		SharedModulesSlot({ id: "places", module: ({ store }) => PlacesModule({ store }) }),
		SharedModulesSlot({ id: "questions", module: () => QuestionsModule }),
		SharedModulesSlot({ id: "tasks", module: ({ file }) => TasksModule({ file }) }),
	);
