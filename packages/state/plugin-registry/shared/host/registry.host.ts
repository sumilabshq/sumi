import type { StoreClient } from "@widgetarium/behaviors/tauri-store";

export interface CatalogueEntry {
	readonly id: string;
	readonly metadata: unknown;
	readonly requires: readonly string[];
	readonly alwaysOn: boolean;
}

export interface PluginRegistryConfig {
	readonly catalogue: readonly CatalogueEntry[];
	readonly startedIds: readonly string[];
	readonly tauri?: {
		readonly store: StoreClient;
	};
}
