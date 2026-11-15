import type { StoreClient } from "@widgetarium/behaviors/tauri-store";

export interface ProfileWindowsIpc {
	invoke(command: string, args?: Readonly<Record<string, unknown>>): Promise<unknown>;
}

export interface WorkspacesConfig {
	readonly tauri?: {
		readonly store: StoreClient;
		readonly ipc: ProfileWindowsIpc;
	};
}
