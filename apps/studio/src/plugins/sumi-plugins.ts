import {
	profileRefusalsOf,
	slotFillsOf,
	slotReaderOf,
	stampSlotName,
	startOrderOf,
} from "@widgetarium/plugin-framework";
import type { Plugin, ShownFill, SlotFills, SumiProfile } from "@widgetarium/plugin-framework";
import type { ServerRuns, ModuleContract } from "@widgetarium/data-framework";
import type { ServerSideModule } from "@widgetarium/data-framework/server";
import { AppsPlugin } from "@sumi/apps-plugin";
import { MainPlugin } from "@sumi/main-plugin";
import {
	SharedModuleSchema,
	SharedModulesSlot,
	SumiHostPlugin,
	TabPageSchema,
	TabPageSlot,
} from "@sumi/sumi-host-plugin";
import type { CoreOffers, DrawnTabPage } from "@sumi/sumi-host-plugin";
import { TerminalPlugin } from "@sumi/terminal-plugin";

export type HostOffers = Omit<CoreOffers, "fillsOf">;

export interface SharedModule {
	readonly contract: ModuleContract<ServerRuns>;
	moduleOf(offers: HostOffers): ServerSideModule;
}

export interface ResolvedPlugins {
	readonly sharedModules: readonly SharedModule[];
	readonly tabPage: DrawnTabPage | null;
	readonly refusals: readonly string[];
}

const INSTALLED_PLUGINS = [SumiHostPlugin, AppsPlugin, MainPlugin, TerminalPlugin];
const SHARED_MODULES = stampSlotName(SumiHostPlugin.id, SharedModulesSlot);
const TAB_PAGE = stampSlotName(SumiHostPlugin.id, TabPageSlot);

const ALWAYS_ON_PLUGINS: readonly string[] = [SumiHostPlugin.id, AppsPlugin.id, MainPlugin.id];

export const BUILT_IN_PROFILE: SumiProfile = {
	plugins: [TerminalPlugin.id],
};

export function resolvePlugins(profile: SumiProfile): ResolvedPlugins {
	const enabledIds = [...ALWAYS_ON_PLUGINS, ...profile.plugins.filter((id) => !ALWAYS_ON_PLUGINS.includes(id))];
	const startOrder = startOrderOf(INSTALLED_PLUGINS, enabledIds);
	const slotFills = slotFillsOf(startOrder.plugins, enabledIds);
	const readerOf = (fill: ShownFill): ReturnType<typeof slotReaderOf> =>
		slotReaderOf(slotFills, pluginOf(startOrder.plugins, fill.pluginId));

	return {
		sharedModules: fillsOf(slotFills, SHARED_MODULES).flatMap((fill) => {
			const parsed = SharedModuleSchema.safeParse(fill.item);
			return parsed.success
				? [
						{
							contract: parsed.data.contract,
							moduleOf: (offers: HostOffers) => parsed.data.module({ ...offers, ...readerOf(fill) }),
						},
					]
				: [];
		}),
		tabPage: tabPageOf(fillsOf(slotFills, TAB_PAGE), readerOf),
		refusals: [...profileRefusalsOf(INSTALLED_PLUGINS, profile), ...startOrder.refusals, ...slotFills.refusals],
	};
}

function tabPageOf(
	fills: readonly ShownFill[],
	readerOf: (fill: ShownFill) => ReturnType<typeof slotReaderOf>,
): DrawnTabPage | null {
	const [fill] = fills;

	if (fill === undefined) {
		return null;
	}

	const parsed = TabPageSchema.safeParse(fill.item);
	return parsed.success ? parsed.data.tabPage(readerOf(fill)) : null;
}

function fillsOf(slotFills: SlotFills, slot: string): readonly ShownFill[] {
	return slotFills.slots.get(slot)?.fills ?? [];
}

function pluginOf(started: readonly Plugin[], pluginId: string): Plugin {
	const found = started.find(({ id }) => id === pluginId);

	if (found === undefined) {
		throw new Error(`plugin ${pluginId} filled a slot but did not start`);
	}

	return found;
}
