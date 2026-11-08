import { MemoryPluginStateStore, fillKeyOf, runtime } from "@widgetarium/plugin-framework";
import type { PluginRuntime, PluginStateStore, ShownFill, SlotShape, SumiProfile } from "@widgetarium/plugin-framework";
import type { ComponentType } from "react";
import { prefixedModule } from "@widgetarium/data-framework";
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
import { git } from "@sumi/git-plugin";
import { htmlViewer } from "@sumi/html-viewer-plugin";
import { imageViewer } from "@sumi/image-viewer-plugin";
import { markdownViewer } from "@sumi/markdown-viewer-plugin";
import { terminal } from "@sumi/terminal-plugin";
import { videoViewer } from "@sumi/video-viewer-plugin";

export type HostOffers = Omit<CoreOffers, "fillsOf">;

export interface BackgroundModule {
	readonly contract: ModuleContract<ServerRuns>;
	readonly prefix: string | null;
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
	readonly prefix: string | null;
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
	readonly startedNames: readonly string[];
	readonly refusals: readonly string[];
	ownPrefixOf(app: string): string | null;
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
	git,
];
const ALWAYS_ON_PLUGINS = [sumiHost, apps, commandMenu, chat, main];

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
		git.id,
	],
};

export function builtInPluginState(): PluginStateStore {
	return new MemoryPluginStateStore(BUILT_IN_PROFILE.plugins);
}

export function startSumiPlugins(store: PluginStateStore): ResolvedPlugins {
	const started = runtime()
		.builtInPlugins(...INSTALLED_PLUGINS)
		.alwaysOn(...ALWAYS_ON_PLUGINS)
		.state(store)
		.withNameResolves()
		.start();
	const tabPages = tabPagesOf(started);
	return {
		backgroundModules: backgroundModulesOf(started),
		windowModules: windowModulesOf(started),
		windowLayers: shownFillsOf(started, sumiHost.windowLayers).flatMap(({ fill, offers }) => {
			const parsed = WindowLayerSchema.safeParse(fill.item);
			return parsed.success ? [{ id: fillKeyOf(fill), layer: parsed.data.layer(offers) }] : [];
		}),
		windowProviders: shownFillsOf(started, sumiHost.windowProviders).flatMap(({ fill, offers }) => {
			const parsed = WindowProviderSchema.safeParse(fill.item);
			return parsed.success
				? [
						{
							id: fillKeyOf(fill),
							providerOf: (windowOffers: WindowOffers) => parsed.data.provider({ ...windowOffers, ...offers }),
						},
					]
				: [];
		}),
		tabPages: tabPages.map(({ drawn }) => drawn),
		frameModules: frameModulesOf(started),
		windowServerModules: windowServerModulesOf(started),
		startedNames: started.startedNames,
		refusals: started.refusals,
		ownPrefixOf: (app) => {
			const drawing = tabPages.find(({ drawn }) => drawn.draws(app));
			return drawing === undefined ? null : started.aliasOf(drawing.pluginId);
		},
	};
}

interface ReadableFill {
	readonly fill: ShownFill;
	readonly offers: ReturnType<PluginRuntime["readerOf"]>;
	readonly prefix: string | null;
}

interface PluginTabPage {
	readonly pluginId: string;
	readonly drawn: DrawnTabPage;
}

function shownFillsOf(started: PluginRuntime, slot: SlotShape): readonly ReadableFill[] {
	return started.fillsOf(slot).map((fill) => ({
		fill,
		offers: started.readerOf(fill.pluginId),
		prefix: started.aliasOf(fill.pluginId),
	}));
}

function backgroundModulesOf(started: PluginRuntime): readonly BackgroundModule[] {
	return shownFillsOf(started, sumiHost.backgroundModules).flatMap(({ fill, offers, prefix }) => {
		const parsed = BackgroundModuleSchema.safeParse(fill.item);
		return parsed.success
			? [
					{
						contract: parsed.data.contract,
						prefix,
						moduleOf: (hostOffers: HostOffers) =>
							prefixedModule(parsed.data.module({ ...hostOffers, ...offers }), prefix),
					},
				]
			: [];
	});
}

function windowModulesOf(started: PluginRuntime): readonly WindowModule[] {
	return shownFillsOf(started, sumiHost.windowModules).flatMap(({ fill, offers, prefix }) => {
		const parsed = WindowModuleSchema.safeParse(fill.item);
		return parsed.success
			? [
					{
						moduleOf: (windowOffers: WindowModuleOffers) =>
							prefixedModule(parsed.data.module({ ...windowOffers, ...offers }), prefix),
					},
				]
			: [];
	});
}

function tabPagesOf(started: PluginRuntime): readonly PluginTabPage[] {
	return shownFillsOf(started, sumiHost.tabPage).flatMap(({ fill, offers }) => {
		const parsed = TabPageSchema.safeParse(fill.item);
		return parsed.success ? [{ pluginId: fill.pluginId, drawn: parsed.data.tabPage(offers) }] : [];
	});
}

function frameModulesOf(started: PluginRuntime): readonly FrameModule[] {
	return shownFillsOf(started, sumiHost.frameModules).flatMap(({ fill, offers, prefix }) => {
		const parsed = FrameModuleSchema.safeParse(fill.item);
		return parsed.success
			? [
					{
						id: fillKeyOf(fill),
						contract: parsed.data.contract,
						prefix,
						servingOf: (windowOffers: WindowOffers) => parsed.data.serving({ ...windowOffers, ...offers }),
					},
				]
			: [];
	});
}

function windowServerModulesOf(started: PluginRuntime): readonly WindowServerModule[] {
	return shownFillsOf(started, sumiHost.windowServerModules).flatMap(({ fill, offers, prefix }) => {
		const parsed = WindowServerModuleSchema.safeParse(fill.item);
		return parsed.success
			? [
					{
						id: fillKeyOf(fill),
						moduleOf: (serverOffers: WindowServerOffers) =>
							prefixedModule(parsed.data.module({ ...serverOffers, ...offers }), prefix),
					},
				]
			: [];
	});
}
