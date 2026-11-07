import type { StoreClient } from "@widgetarium/behaviors/tauri-store";

export interface CoreChanges {
	onCoreChanged(listener: () => void): () => void;
}

export interface AppHostConfig {
	readonly tauri?: {
		readonly store: StoreClient;
		readonly coreChanges: CoreChanges;
	};
}
