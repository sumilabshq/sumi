import type { StoreClient } from "@widgetarium/behaviors/tauri-store";

export interface HomeLayoutConfig {
	readonly store?: StoreClient | undefined;
}
