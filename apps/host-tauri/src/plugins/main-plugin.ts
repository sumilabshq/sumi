import { APP_MODULES } from "@widgetarium/app-registry/modules";
import type { ServerSideModule } from "@widgetarium/data-framework/server";
import { FileSystemModule } from "@widgetarium/file-system/module";
import { plugin } from "@widgetarium/plugin-framework";
import { PlacesModule } from "@widgetarium/places/module";
import { QuestionsModule } from "@widgetarium/questions/module";
import { SharedModulesSlot, SumiHostPlugin } from "./sumi-host-plugin.js";

const CORE_MODULES: readonly ServerSideModule[] = [PlacesModule, FileSystemModule, QuestionsModule, ...APP_MODULES];

export const MainPlugin = plugin("main")
	.require(SumiHostPlugin)
	.fill(...CORE_MODULES.map((module) => SharedModulesSlot({ id: module.definition.name, module })));
