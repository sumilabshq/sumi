import type { StoreClient } from "@widgetarium/behaviors/tauri-store";

export interface WorkspacesConfig {
	readonly tauri?: {
		readonly store: StoreClient;
	};
}
