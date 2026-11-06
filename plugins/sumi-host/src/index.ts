import { z } from "zod";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { ServerSideModule } from "@widgetarium/data-framework/server";
import { plugin, slot } from "@widgetarium/plugin-framework";
import type { BoardFile } from "@widgetarium/tasks/module";

export interface CoreOffers {
	readonly store: StoreClient;
	readonly file: BoardFile;
}

export type SharedModuleOf = (offers: CoreOffers) => ServerSideModule;

const NOT_A_MODULE_OF =
	"a shared module is a function of what the core offers, answering a module(...) configured from it";

export const SharedModuleSchema = z.object({
	module: z.custom<SharedModuleOf>((value) => typeof value === "function", NOT_A_MODULE_OF),
});

export const SharedModulesSlot = slot("shared-modules").item(SharedModuleSchema).list();

export const SumiHostPlugin = plugin("sumi-host").declare(SharedModulesSlot);
