import { z } from "zod";
import type { ServerSideModule } from "@widgetarium/data-framework/server";
import { plugin, slot } from "@widgetarium/plugin-framework";

const NOT_A_MODULE = "a shared module is a module(...) with its handlers, as its package's ./module entry exports it";

export const SharedModuleSchema = z.object({
	module: z.custom<ServerSideModule>(isServerSideModule, NOT_A_MODULE),
});

export const SharedModulesSlot = slot("shared-modules").item(SharedModuleSchema).list();

export const SumiHostPlugin = plugin("sumi-host").declare(SharedModulesSlot);

function isServerSideModule(value: unknown): boolean {
	return typeof value === "object" && value !== null && "definition" in value && "handlers" in value;
}
