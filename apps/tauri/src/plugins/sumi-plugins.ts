import type { ServerSideModule } from "@widgetarium/data-framework/server";
import { profileRefusalsOf, slotFillsOf, stampSlotName, startOrderOf } from "@widgetarium/plugin-framework";
import type { SumiProfile } from "@widgetarium/plugin-framework";
import { MainPlugin } from "@sumi/main-plugin";
import { SharedModuleSchema, SharedModulesSlot, SumiHostPlugin } from "@sumi/sumi-host-plugin";

export interface ResolvedPlugins {
	readonly sharedModules: readonly ServerSideModule[];
	readonly refusals: readonly string[];
}

const INSTALLED_PLUGINS = [SumiHostPlugin, MainPlugin];
const SHARED_MODULES = stampSlotName(SumiHostPlugin.id, SharedModulesSlot);

const ALWAYS_ON_PLUGINS: readonly string[] = [SumiHostPlugin.id, MainPlugin.id];

export const BUILT_IN_PROFILE: SumiProfile = {
	plugins: [],
};

export function resolvePlugins(profile: SumiProfile): ResolvedPlugins {
	const enabledIds = [...ALWAYS_ON_PLUGINS, ...profile.plugins.filter((id) => !ALWAYS_ON_PLUGINS.includes(id))];
	const startOrder = startOrderOf(INSTALLED_PLUGINS, enabledIds);
	const slotFills = slotFillsOf(startOrder.plugins, enabledIds);
	const sharedFills = slotFills.slots.get(SHARED_MODULES)?.fills ?? [];

	return {
		sharedModules: sharedFills.flatMap((each) => {
			const parsed = SharedModuleSchema.safeParse(each.item);
			return parsed.success ? [parsed.data.module] : [];
		}),
		refusals: [...profileRefusalsOf(INSTALLED_PLUGINS, profile), ...startOrder.refusals, ...slotFills.refusals],
	};
}
