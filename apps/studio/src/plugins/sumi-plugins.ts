import { profileRefusalsOf, slotFillsOf, slotReaderOf, startOrderOf } from "@widgetarium/plugin-framework";
import type { Plugin, ShownFill, SlotFills, SumiProfile } from "@widgetarium/plugin-framework";
import type { ComponentType } from "react";
import type { DeviceModule, ModuleContract, ServerRuns, ServerSideModule } from "@widgetarium/data-framework";
import { apps } from "@sumi/apps-plugin";
import { chat } from "@sumi/chat-plugin";
import { commandMenu } from "@sumi/command-menu-plugin";
import { main } from "@sumi/main-plugin";
import {
	BackgroundModuleSchema,
	FrameModuleSchema,
	WindowServerModuleSchema,
	sumiHost,
	TabPageSchema,
	WindowLayerSchema,
	WindowModuleSchema,
	WindowProviderSchema,
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
import { browserPage } from "@sumi/browser-page-plugin";
import { codeViewer } from "@sumi/code-viewer-plugin";
import { files } from "@sumi/files-plugin";
import { htmlViewer } from "@sumi/html-viewer-plugin";
import { imageViewer } from "@sumi/image-viewer-plugin";
import { markdownViewer } from "@sumi/markdown-viewer-plugin";
import { terminal } from "@sumi/terminal-plugin";
import { videoViewer } from "@sumi/video-viewer-plugin";

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
	sumiHost,
	apps,
	commandMenu,
	chat,
	main,
	terminal,
	browserPage,
	files,
	markdownViewer,
	codeViewer,
	imageViewer,
	videoViewer,
	htmlViewer,
];
const BACKGROUND_MODULES = sumiHost.backgroundModules.name;
const TAB_PAGE = sumiHost.tabPage.name;
const WINDOW_MODULES = sumiHost.windowModules.name;
const WINDOW_LAYERS = sumiHost.windowLayers.name;
const WINDOW_PROVIDERS = sumiHost.windowProviders.name;
const FRAME_MODULES = sumiHost.frameModules.name;
const WINDOW_SERVER_MODULES = sumiHost.windowServerModules.name;

const ALWAYS_ON_PLUGINS: readonly string[] = [sumiHost.id, apps.id, commandMenu.id, chat.id, main.id];

export const BUILT_IN_PROFILE: SumiProfile = {
	plugins: [
		terminal.id,
		browserPage.id,
		files.id,
		markdownViewer.id,
		codeViewer.id,
		imageViewer.id,
		videoViewer.id,
		htmlViewer.id,
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
							id: `${fill.pluginId}.${fill.id}`,
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
							id: `${fill.pluginId}.${fill.id}`,
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
							id: `${fill.pluginId}.${fill.id}`,
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
							id: `${fill.pluginId}.${fill.id}`,
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
