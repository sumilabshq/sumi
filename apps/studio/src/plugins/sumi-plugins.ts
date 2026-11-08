import {
	profileRefusalsOf,
	slotFillsOf,
	slotReaderOf,
	stampSlotName,
	startOrderOf,
} from "@widgetarium/plugin-framework";
import type { Plugin, ShownFill, SlotFills, SumiProfile } from "@widgetarium/plugin-framework";
import type { ComponentType } from "react";
import type { DeviceModule, ModuleContract, ServerRuns, ServerSideModule } from "@widgetarium/data-framework";
import { AppsPlugin } from "@sumi/apps-plugin";
import { ChatPlugin } from "@sumi/chat-plugin";
import { CommandMenuPlugin } from "@sumi/command-menu-plugin";
import { MainPlugin } from "@sumi/main-plugin";
import {
	BackgroundModuleSchema,
	BackgroundModulesSlot,
	FrameModuleSchema,
	FrameModulesSlot,
	WindowServerModuleSchema,
	WindowServerModulesSlot,
	SumiHostPlugin,
	TabPageSchema,
	TabPageSlot,
	WindowLayerSchema,
	WindowLayersSlot,
	WindowModuleSchema,
	WindowModulesSlot,
	WindowProviderSchema,
	WindowProvidersSlot,
} from "@sumi/sumi-host-plugin";
import type {
	CoreOffers,
	DrawnTabPage,
	FrameServing,
	WindowModuleOffers,
	WindowOffers,
	WindowProviderProps,
	WindowServerOffers,
} from "@sumi/sumi-host-plugin";
import { BrowserPagePlugin } from "@sumi/browser-page-plugin";
import { CodeViewerPlugin } from "@sumi/code-viewer-plugin";
import { FilesPlugin } from "@sumi/files-plugin";
import { GitPlugin } from "@sumi/git-plugin";
import { HtmlViewerPlugin } from "@sumi/html-viewer-plugin";
import { ImageViewerPlugin } from "@sumi/image-viewer-plugin";
import { MarkdownViewerPlugin } from "@sumi/markdown-viewer-plugin";
import { TerminalPlugin } from "@sumi/terminal-plugin";
import { VideoViewerPlugin } from "@sumi/video-viewer-plugin";

export type HostOffers = Omit<CoreOffers, "fillsOf">;

export interface BackgroundModule {
	readonly contract: ModuleContract<ServerRuns>;
	moduleOf(offers: HostOffers): ServerSideModule;
}

export interface WindowLayer {
	readonly id: string;
	readonly layer: ComponentType;
}

export interface WindowProvider {
	readonly id: string;
	providerOf(offers: WindowOffers): ComponentType<WindowProviderProps>;
}

export interface FrameModule {
	readonly id: string;
	readonly contract: ModuleContract<ServerRuns>;
	servingOf(offers: WindowOffers): FrameServing;
}

export interface WindowModule {
	moduleOf(offers: WindowModuleOffers): DeviceModule;
}

export interface WindowServerModule {
	readonly id: string;
	moduleOf(offers: WindowServerOffers): ServerSideModule;
}

export interface ResolvedPlugins {
	readonly backgroundModules: readonly BackgroundModule[];
	readonly windowModules: readonly WindowModule[];
	readonly windowLayers: readonly WindowLayer[];
	readonly windowProviders: readonly WindowProvider[];
	readonly tabPages: readonly DrawnTabPage[];
	readonly frameModules: readonly FrameModule[];
	readonly windowServerModules: readonly WindowServerModule[];
	readonly refusals: readonly string[];
}

const INSTALLED_PLUGINS = [
	SumiHostPlugin,
	AppsPlugin,
	CommandMenuPlugin,
	ChatPlugin,
	MainPlugin,
	TerminalPlugin,
	BrowserPagePlugin,
	FilesPlugin,
	MarkdownViewerPlugin,
	CodeViewerPlugin,
	ImageViewerPlugin,
	VideoViewerPlugin,
	HtmlViewerPlugin,
	GitPlugin,
];
const BACKGROUND_MODULES = stampSlotName(SumiHostPlugin.id, BackgroundModulesSlot);
const TAB_PAGE = stampSlotName(SumiHostPlugin.id, TabPageSlot);
const WINDOW_MODULES = stampSlotName(SumiHostPlugin.id, WindowModulesSlot);
const WINDOW_LAYERS = stampSlotName(SumiHostPlugin.id, WindowLayersSlot);
const WINDOW_PROVIDERS = stampSlotName(SumiHostPlugin.id, WindowProvidersSlot);
const FRAME_MODULES = stampSlotName(SumiHostPlugin.id, FrameModulesSlot);
const WINDOW_SERVER_MODULES = stampSlotName(SumiHostPlugin.id, WindowServerModulesSlot);

const ALWAYS_ON_PLUGINS: readonly string[] = [
	SumiHostPlugin.id,
	AppsPlugin.id,
	CommandMenuPlugin.id,
	ChatPlugin.id,
	MainPlugin.id,
];

export const BUILT_IN_PROFILE: SumiProfile = {
	plugins: [
		TerminalPlugin.id,
		BrowserPagePlugin.id,
		FilesPlugin.id,
		MarkdownViewerPlugin.id,
		CodeViewerPlugin.id,
		ImageViewerPlugin.id,
		VideoViewerPlugin.id,
		HtmlViewerPlugin.id,
		GitPlugin.id,
	],
};

export function resolvePlugins(profile: SumiProfile): ResolvedPlugins {
	const enabledIds = [...ALWAYS_ON_PLUGINS, ...profile.plugins.filter((id) => !ALWAYS_ON_PLUGINS.includes(id))];
	const startOrder = startOrderOf(INSTALLED_PLUGINS, enabledIds);
	const slotFills = slotFillsOf(startOrder.plugins, enabledIds);
	const readerOf = (fill: ShownFill): ReturnType<typeof slotReaderOf> =>
		slotReaderOf(slotFills, pluginOf(startOrder.plugins, fill.pluginId));

	return {
		backgroundModules: fillsOf(slotFills, BACKGROUND_MODULES).flatMap((fill) => {
			const parsed = BackgroundModuleSchema.safeParse(fill.item);
			return parsed.success
				? [
						{
							contract: parsed.data.contract,
							moduleOf: (offers: HostOffers) => parsed.data.module({ ...offers, ...readerOf(fill) }),
						},
					]
				: [];
		}),
		windowModules: fillsOf(slotFills, WINDOW_MODULES).flatMap((fill) => {
			const parsed = WindowModuleSchema.safeParse(fill.item);
			return parsed.success
				? [{ moduleOf: (offers: WindowModuleOffers) => parsed.data.module({ ...offers, ...readerOf(fill) }) }]
				: [];
		}),
		windowLayers: fillsOf(slotFills, WINDOW_LAYERS).flatMap((fill) => {
			const parsed = WindowLayerSchema.safeParse(fill.item);
			return parsed.success
				? [
						{
							id: `${fill.pluginId}/${fill.id}`,
							layer: parsed.data.layer(readerOf(fill)),
						},
					]
				: [];
		}),
		windowProviders: fillsOf(slotFills, WINDOW_PROVIDERS).flatMap((fill) => {
			const parsed = WindowProviderSchema.safeParse(fill.item);
			return parsed.success
				? [
						{
							id: `${fill.pluginId}/${fill.id}`,
							providerOf: (offers: WindowOffers) => parsed.data.provider({ ...offers, ...readerOf(fill) }),
						},
					]
				: [];
		}),
		tabPages: fillsOf(slotFills, TAB_PAGE).flatMap((fill) => {
			const parsed = TabPageSchema.safeParse(fill.item);
			return parsed.success ? [parsed.data.tabPage(readerOf(fill))] : [];
		}),
		frameModules: fillsOf(slotFills, FRAME_MODULES).flatMap((fill) => {
			const parsed = FrameModuleSchema.safeParse(fill.item);
			return parsed.success
				? [
						{
							id: `${fill.pluginId}/${fill.id}`,
							contract: parsed.data.contract,
							servingOf: (offers: WindowOffers) => parsed.data.serving({ ...offers, ...readerOf(fill) }),
						},
					]
				: [];
		}),
		windowServerModules: fillsOf(slotFills, WINDOW_SERVER_MODULES).flatMap((fill) => {
			const parsed = WindowServerModuleSchema.safeParse(fill.item);
			return parsed.success
				? [
						{
							id: `${fill.pluginId}/${fill.id}`,
							moduleOf: (offers: WindowServerOffers) => parsed.data.module({ ...offers, ...readerOf(fill) }),
						},
					]
				: [];
		}),
		refusals: [...profileRefusalsOf(INSTALLED_PLUGINS, profile), ...startOrder.refusals, ...slotFills.refusals],
	};
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
