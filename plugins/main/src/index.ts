import { SharedModulesSlot, SumiHostPlugin } from "@sumi/sumi-host-plugin";
import type { ServerSideModule } from "@widgetarium/data-framework/server";
import { plugin } from "@widgetarium/plugin-framework";
import { PlacesModule } from "@widgetarium/places/module";
import { QuestionsModule } from "@widgetarium/questions/module";
import { TasksModule } from "@widgetarium/tasks/module";

const OLD_APP_MODULES: readonly ServerSideModule[] = [PlacesModule, QuestionsModule, TasksModule];

export const MainPlugin = plugin("main")
	.require(SumiHostPlugin)
	.fill(...OLD_APP_MODULES.map((module) => SharedModulesSlot({ id: module.definition.name, module })));
