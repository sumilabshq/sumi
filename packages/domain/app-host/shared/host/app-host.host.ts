import type { StoreClient } from "@widgetarium/behaviors/tauri-store";

export interface CoreChanges {
	onCoreChanged(listener: () => void): () => void;
}

export interface PluginAppFace {
	readonly id: string;
	readonly title: string;
	readonly icon: string;
}

export interface AppHostConfig {
	readonly tauri?: {
		readonly store: StoreClient;
		readonly coreChanges: CoreChanges;
	};
	readonly apps?: readonly PluginAppFace[];
}
