import type { StoreClient } from "@widgetarium/behaviors/tauri-store";

export interface PinsConfig {
	readonly store?: StoreClient | undefined;
}
