import type { ComponentType, ReactNode } from "react";
import { z } from "zod";
import type { AssistantHosts } from "@widgetarium/assistant/module";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";
import { ModuleContract } from "@widgetarium/data-framework";
import type {
	DeviceModule,
	Platform,
	RemoteModule,
	RemoteTransport,
	ServerRuns,
	StartedApp,
} from "@widgetarium/data-framework";
import type { ServerSideModule } from "@widgetarium/data-framework/server";
import { slot } from "@widgetarium/plugin-framework";
import type { SlotReader } from "@widgetarium/plugin-framework";
import type { BoardFile } from "@widgetarium/tasks/module";

export interface CoreOffers extends SlotReader {
	readonly store: StoreClient;
	readonly file: BoardFile;
}

export type BackgroundModuleOf = (offers: CoreOffers) => ServerSideModule;

export interface TabPageProps {
	readonly app: string;
	readonly tabId: string;
}

export interface WindowOffers {
	readonly workspaceId: string;
	readonly platform: Platform;
	readonly windowApp: StartedApp;
	readonly core: RemoteTransport;
	readonly assistant: AssistantHosts;
	focusedChatId(): string | null;
}

export interface TabModules {
	readonly modules: readonly DeviceModule[];
	readonly imports: readonly RemoteModule[];
}

export interface DrawnTabPage {
	readonly page: ComponentType<TabPageProps>;
	readonly header: "shell" | "none";
	draws(app: string): boolean;
	modulesOf(tab: TabPageProps, offers: WindowOffers): Promise<TabModules>;
}

export interface WindowProviderProps {
	readonly children: ReactNode;
}

export type TabPageOf = (offers: SlotReader) => DrawnTabPage;

export type WindowModuleOf = (offers: SlotReader) => DeviceModule;

export type WindowLayerOf = (offers: SlotReader) => ComponentType;

export type WindowProviderOf = (offers: SlotReader & WindowOffers) => ComponentType<WindowProviderProps>;

export interface FrameServing {
	readonly module: ServerSideModule;
	frameClosed(tabId: string): void;
}

export type FrameServingOf = (offers: SlotReader & WindowOffers) => FrameServing;

const NOT_A_MODULE_OF =
	"a background module is a function of what the core offers, answering a module(...) configured from it";
const NOT_A_CONTRACT = 'a background module names its contract, the module(...) descriptor of its package\'s "." entry';
const NOT_A_TAB_PAGE_OF = "a tab page is a function of the plugin's slot reader, answering { page, draws }";
const NOT_A_WINDOW_MODULE_OF =
	"a window module is a function of the plugin's slot reader, answering a module(...) the studio window runs";
const NOT_A_WINDOW_LAYER_OF =
	"a window layer is a function of the plugin's slot reader, answering a React component the window draws over its frame";
const NOT_A_WINDOW_PROVIDER_OF =
	"a window provider is a function of the plugin's slot reader and the window's offers, answering a React component that wraps the window's frame";

const NOT_A_FRAME_CONTRACT =
	'a frame module names its contract, the module(...) descriptor of its package\'s "." entry, keyed by { tab }';
const NOT_A_FRAME_SERVING_OF =
	"a frame module is a function of the plugin's slot reader and the window's offers, answering { module, frameClosed(tabId) }";

export const BackgroundModuleSchema = z.object({
	module: z.custom<BackgroundModuleOf>((value) => typeof value === "function", NOT_A_MODULE_OF),
	contract: z.custom<ModuleContract<ServerRuns>>((value) => value instanceof ModuleContract, NOT_A_CONTRACT),
});

export const BackgroundModulesSlot = slot("background-modules").item(BackgroundModuleSchema).list();

export const TabPageSchema = z.object({
	tabPage: z.custom<TabPageOf>((value) => typeof value === "function", NOT_A_TAB_PAGE_OF),
});

export const TabPageSlot = slot("tab-page").item(TabPageSchema).list();

export const WindowModuleSchema = z.object({
	module: z.custom<WindowModuleOf>((value) => typeof value === "function", NOT_A_WINDOW_MODULE_OF),
});

export const WindowModulesSlot = slot("window-modules").item(WindowModuleSchema).list();

export const WindowLayerSchema = z.object({
	layer: z.custom<WindowLayerOf>((value) => typeof value === "function", NOT_A_WINDOW_LAYER_OF),
});

export const WindowLayersSlot = slot("window-layers").item(WindowLayerSchema).list();

export const WindowProviderSchema = z.object({
	provider: z.custom<WindowProviderOf>((value) => typeof value === "function", NOT_A_WINDOW_PROVIDER_OF),
});

export const WindowProvidersSlot = slot("window-providers").item(WindowProviderSchema).list();

export const FrameModuleSchema = z.object({
	contract: z.custom<ModuleContract<ServerRuns>>((value) => value instanceof ModuleContract, NOT_A_FRAME_CONTRACT),
	serving: z.custom<FrameServingOf>((value) => typeof value === "function", NOT_A_FRAME_SERVING_OF),
});

export const FrameModulesSlot = slot("frame-modules").item(FrameModuleSchema).list();
