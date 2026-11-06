import type { StoreClient } from "@widgetarium/behaviors/tauri-store";

export interface PlacesConfig {
	readonly store: StoreClient;
}
