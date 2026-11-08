import type { ComponentType, ReactNode } from "react";
import type { AssistantHosts } from "@widgetarium/assistant/implementation";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";
import type {
	ModuleContract,
	DeviceModule,
	Platform,
	RemoteModule,
	RemoteTransport,
	Runtime,
	ServerRuns,
	ServerSideModule,
} from "@widgetarium/data-framework";
import { service } from "@widgetarium/plugin-framework";
import type { BoardFile } from "@widgetarium/tasks/implementation";

export interface BackendOffers {
	readonly store: StoreClient;
	readonly file: BoardFile;
}

export interface BackendServer {
	readonly name: string;
	readonly modules: readonly ServerSideModule[];
	serve(runtime: Runtime): void;
}

export interface TabPageProps {
	readonly app: string;
	readonly tabId: string;
}

export interface WindowServerOffers {
	readonly workspaceId: string;
	readonly platform: Platform;
	readonly core: RemoteTransport;
	readonly assistant: AssistantHosts;
}

export interface WindowOffers {
	readonly workspaceId: string;
	readonly platform: Platform;
	readonly windowApp: Runtime;
	readonly core: RemoteTransport;
	readonly windowServer: RemoteTransport;
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

export interface CoreChanges {
	onCoreChanged(listener: () => void): () => void;
}

export interface WindowModuleOffers {
	readonly tauri?: {
		readonly store: StoreClient;
		readonly coreChanges: CoreChanges;
	};
}

export interface FrameServing {
	readonly module: ServerSideModule;
	frameClosed(tabId: string): void;
}

export interface Backend {
	module(module: ServerSideModule, contract: ModuleContract<ServerRuns>): void;
	moduleOf(build: (offers: BackendOffers) => ServerSideModule, contract: ModuleContract<ServerRuns>): void;
	server(server: BackendServer): void;
}

export interface Windows {
	module(module: DeviceModule): void;
	moduleOf(build: (offers: WindowModuleOffers) => DeviceModule): void;
	serverModule(build: (offers: WindowServerOffers) => ServerSideModule): void;
}

export interface Shell {
	tabPage(page: DrawnTabPage): void;
	layer(layer: ComponentType): void;
	provider(provider: (offers: WindowOffers) => ComponentType<WindowProviderProps>): void;
	frameModule(contract: ModuleContract<ServerRuns>, serving: (offers: WindowOffers) => FrameServing): void;
}

export const backend = service<Backend>("backend");

export const windows = service<Windows>("windows");

export const shell = service<Shell>("shell");
