import type { StoreClient } from "@widgetarium/behaviors/tauri-store";

export interface LayoutConfig {
	readonly tauri?: {
		readonly store: StoreClient;
	};
}
