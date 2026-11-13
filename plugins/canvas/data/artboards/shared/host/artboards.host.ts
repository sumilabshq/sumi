import type { StoreClient } from "@widgetarium/behaviors/tauri-store";

export interface ArtboardsConfig {
	readonly store?: StoreClient | undefined;
}
