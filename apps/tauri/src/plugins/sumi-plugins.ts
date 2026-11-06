import { profileRefusalsOf, slotFillsOf, stampSlotName, startOrderOf } from "@widgetarium/plugin-framework";
import type { ShownFill, SlotFills, SumiProfile } from "@widgetarium/plugin-framework";
import { AppSchema, AppsPlugin, AppsSlot } from "@sumi/apps-plugin";
import type { PluginApp } from "@sumi/apps-plugin";
import { MainPlugin } from "@sumi/main-plugin";
import { SharedModuleSchema, SharedModulesSlot, SumiHostPlugin } from "@sumi/sumi-host-plugin";
import type { SharedModuleOf } from "@sumi/sumi-host-plugin";
import { TerminalPlugin } from "@sumi/terminal-plugin";

export interface ResolvedPlugins {
	readonly sharedModules: readonly SharedModuleOf[];
	readonly apps: readonly PluginApp[];
	readonly refusals: readonly string[];
}

const INSTALLED_PLUGINS = [SumiHostPlugin, AppsPlugin, MainPlugin, TerminalPlugin];
const SHARED_MODULES = stampSlotName(SumiHostPlugin.id, SharedModulesSlot);
const APPS = stampSlotName(AppsPlugin.id, AppsSlot);

const ALWAYS_ON_PLUGINS: readonly string[] = [SumiHostPlugin.id, AppsPlugin.id, MainPlugin.id];

export const BUILT_IN_PROFILE: SumiProfile = {
	plugins: [TerminalPlugin.id],
};

export function resolvePlugins(profile: SumiProfile): ResolvedPlugins {
	const enabledIds = [...ALWAYS_ON_PLUGINS, ...profile.plugins.filter((id) => !ALWAYS_ON_PLUGINS.includes(id))];
	const startOrder = startOrderOf(INSTALLED_PLUGINS, enabledIds);
	const slotFills = slotFillsOf(startOrder.plugins, enabledIds);

	return {
		sharedModules: fillsOf(slotFills, SHARED_MODULES).flatMap(({ item }) => {
			const parsed = SharedModuleSchema.safeParse(item);
			return parsed.success ? [parsed.data.module] : [];
		}),
		apps: fillsOf(slotFills, APPS).flatMap(({ id, item }) => {
			const parsed = AppSchema.safeParse(item);
			return parsed.success ? [{ id, ...parsed.data }] : [];
		}),
		refusals: [...profileRefusalsOf(INSTALLED_PLUGINS, profile), ...startOrder.refusals, ...slotFills.refusals],
	};
}

function fillsOf(slotFills: SlotFills, slot: string): readonly ShownFill[] {
	return slotFills.slots.get(slot)?.fills ?? [];
}
