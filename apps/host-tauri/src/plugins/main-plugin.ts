import { APP_MODULES } from "@widgetarium/app-registry/modules";
import type { ServerSideModule } from "@widgetarium/data-framework/server";
import { plugin } from "@widgetarium/plugin-framework";
import { PlacesModule } from "@widgetarium/places/module";
import { QuestionsModule } from "@widgetarium/questions/module";
import { isHostCapability } from "./host-capabilities.js";
import { SharedModulesSlot, SumiHostPlugin } from "./sumi-host-plugin.js";

const OLD_APP_MODULES: readonly ServerSideModule[] = [PlacesModule, QuestionsModule, ...APP_MODULES].filter(
	(module) => !isHostCapability(module),
);

export const MainPlugin = plugin("main")
	.require(SumiHostPlugin)
	.fill(...OLD_APP_MODULES.map((module) => SharedModulesSlot({ id: module.definition.name, module })));
