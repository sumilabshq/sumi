import type { StoreClient } from "@widgetarium/behaviors/tauri-store";

export interface TabViewsConfig {
	readonly store?: StoreClient | undefined;
}
