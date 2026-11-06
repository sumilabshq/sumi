import { SharedModulesSlot, SumiHostPlugin } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { PlacesModule as PlacesContract } from "@widgetarium/places";
import { PlacesModule } from "@widgetarium/places/module";
import { QuestionsModule as QuestionsContract } from "@widgetarium/questions";
import { QuestionsModule } from "@widgetarium/questions/module";
import { TasksModule as TasksContract } from "@widgetarium/tasks";
import { TasksModule } from "@widgetarium/tasks/module";

export const MainPlugin = plugin("main")
	.require(SumiHostPlugin)
	.fill(
		SharedModulesSlot({ id: "places", module: ({ store }) => PlacesModule({ store }), contract: PlacesContract }),
		SharedModulesSlot({ id: "questions", module: () => QuestionsModule, contract: QuestionsContract }),
		SharedModulesSlot({ id: "tasks", module: ({ file }) => TasksModule({ file }), contract: TasksContract }),
	);
