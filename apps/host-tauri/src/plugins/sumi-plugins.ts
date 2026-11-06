import type { ServerSideModule } from "@widgetarium/data-framework/server";
import { profileRefusalsOf, slotFillsOf, stampSlotName, startOrderOf } from "@widgetarium/plugin-framework";
import type { SumiProfile } from "@widgetarium/plugin-framework";
import { MainPlugin } from "./main-plugin.js";
import { SharedModuleSchema, SharedModulesSlot, SumiHostPlugin } from "./sumi-host-plugin.js";

export interface ResolvedPlugins {
	readonly sharedModules: readonly ServerSideModule[];
	readonly refusals: readonly string[];
}

const INSTALLED_PLUGINS = [SumiHostPlugin, MainPlugin];
const SHARED_MODULES = stampSlotName(SumiHostPlugin.id, SharedModulesSlot);

export const BUILT_IN_PROFILE: SumiProfile = {
	plugins: ["sumi-host", "main"],
	locked: ["sumi-host", "main"],
};

export function resolvePlugins(profile: SumiProfile): ResolvedPlugins {
	const startOrder = startOrderOf(INSTALLED_PLUGINS, profile.plugins);
	const slotFills = slotFillsOf(startOrder.plugins, profile.plugins);
	const sharedFills = slotFills.slots.get(SHARED_MODULES)?.fills ?? [];

	return {
		sharedModules: sharedFills.flatMap((each) => {
			const parsed = SharedModuleSchema.safeParse(each.item);
			return parsed.success ? [parsed.data.module] : [];
		}),
		refusals: [...profileRefusalsOf(INSTALLED_PLUGINS, profile), ...startOrder.refusals, ...slotFills.refusals],
	};
}
