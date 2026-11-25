import type { StoreClient } from "@widgetarium/behaviors/tauri-store";

export interface SystemScheme {
	readonly matches: boolean;
	addEventListener(type: "change", listener: () => void): void;
	removeEventListener(type: "change", listener: () => void): void;
}

export interface AppearanceConfig {
	readonly systemScheme: SystemScheme;
	readonly tauri?: {
		readonly store: StoreClient;
	};
}
