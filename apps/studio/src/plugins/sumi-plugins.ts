import { MemoryPluginStateStore, runtime } from "@widgetarium/plugin-framework";
import type { PluginStateStore, SlotFills, SumiProfile } from "@widgetarium/plugin-framework";
import type { ComponentType } from "react";
import type {
	DeviceModule,
	McpServer,
	ModuleContract,
	Runtime,
	ServerRuns,
	ServerSideModule,
} from "@widgetarium/data-framework";
import { apps } from "@sumi/apps-plugin";
import { chat } from "@sumi/chat-plugin";
import { commandMenu } from "@sumi/command-menu-plugin";
import { composerExpand } from "@sumi/composer-expand-plugin";
import { main } from "@sumi/main-plugin";
import { mcp } from "@sumi/mcp-plugin";
import { questions } from "@sumi/questions-plugin";
import { tasks } from "@sumi/tasks-plugin";
import { agents, backend, shell, sumiHost, windows } from "@sumi/sumi-host-plugin";
import type {
	BackendOffers,
	DrawnTabPage,
	FrameServing,
	WindowModuleOffers,
	WindowOffers,
	WindowProviderProps,
	WindowServerOffers,
} from "@sumi/sumi-host-plugin";
import { agentsFor, backendFor, emptyHostRegistrations, shellFor, windowsFor } from "./host-services.js";
import { browserPage } from "@sumi/browser-page-plugin";
import { codeViewer } from "@sumi/code-viewer-plugin";
import { files } from "@sumi/files-plugin";
import { git } from "@sumi/git-plugin";
import { htmlViewer } from "@sumi/html-viewer-plugin";
import { imageViewer } from "@sumi/image-viewer-plugin";
import { markdownViewer } from "@sumi/markdown-viewer-plugin";
import { terminal } from "@sumi/terminal-plugin";
import { videoViewer } from "@sumi/video-viewer-plugin";

export interface BackgroundModule {
	readonly contract: ModuleContract<ServerRuns>;
	readonly prefix: string | null;
	moduleOf(offers: BackendOffers): ServerSideModule;
}

export interface HostServer {
	readonly name: string;
	readonly prefix: string | null;
	readonly modules: readonly ServerSideModule[];
	serve(runtime: Runtime): void;
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

export interface AgentMcpServer {
	serve(offers: WindowOffers): McpServer;
}

export interface PluginTabPage {
	readonly pluginId: string;
	readonly drawn: DrawnTabPage;
}

export interface ResolvedPlugins {
	readonly backgroundModules: readonly BackgroundModule[];
	readonly windowModules: readonly WindowModule[];
	readonly windowLayers: readonly WindowLayer[];
	readonly windowProviders: readonly WindowProvider[];
	readonly tabPages: readonly DrawnTabPage[];
	readonly frameModules: readonly FrameModule[];
	readonly windowServerModules: readonly WindowServerModule[];
	readonly servers: readonly HostServer[];
	readonly agentMcpServers: readonly AgentMcpServer[];
	readonly startedIds: readonly string[];
	readonly refusals: readonly string[];
	readonly notes: readonly string[];
	readonly slotFills: SlotFills;
	ownPrefixOf(app: string): string | null;
}

const INSTALLED_PLUGINS = [
	sumiHost,
	apps,
	commandMenu,
	chat,
	main,
	mcp,
	questions,
	tasks,
	terminal,
	browserPage,
	files,
	markdownViewer,
	codeViewer,
	imageViewer,
	videoViewer,
	htmlViewer,
	git,
	composerExpand,
];
const ALWAYS_ON_PLUGINS = [sumiHost, apps, commandMenu, chat, main, mcp, questions, tasks];

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
		composerExpand.id,
	],
};

export function builtInPluginState(): PluginStateStore {
	return new MemoryPluginStateStore(BUILT_IN_PROFILE.plugins);
}

export function startSumiPlugins(store: PluginStateStore): ResolvedPlugins {
	const registered = emptyHostRegistrations();
	const started = runtime()
		.builtInPlugins(...INSTALLED_PLUGINS)
		.alwaysOn(...ALWAYS_ON_PLUGINS)
		.state(store)
		.withNameResolves()
		.provide(backend, backendFor(registered))
		.provide(windows, windowsFor(registered))
		.provide(shell, shellFor(registered))
		.provide(agents, agentsFor(registered))
		.start();
	return {
		backgroundModules: registered.backgroundModules,
		windowModules: registered.windowModules,
		windowLayers: registered.windowLayers,
		windowProviders: registered.windowProviders,
		tabPages: registered.tabPages.map(({ drawn }) => drawn),
		frameModules: registered.frameModules,
		windowServerModules: registered.windowServerModules,
		servers: registered.servers,
		agentMcpServers: registered.agentMcpServers,
		startedIds: started.startedIds,
		refusals: started.refusals,
		notes: started.notes,
		slotFills: started.slotFills,
		// TODO: two plugins drawing one app: the first tab page's plugin is taken as the frame's own
		ownPrefixOf: (app) => {
			const drawing = registered.tabPages.find(({ drawn }) => drawn.draws(app));
			return drawing === undefined ? null : started.modulePrefixOf(drawing.pluginId);
		},
	};
}
