import type { StoreClient } from "@widgetarium/behaviors/tauri-store";

export interface StudioWindows {
	openLabels(): Promise<readonly string[]>;
	onOwnCloseAsked(listener: () => void): void;
}

export interface LayoutConfig {
	readonly tauri?: {
		readonly store: StoreClient;
		readonly windows: StudioWindows;
	};
}
