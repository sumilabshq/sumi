export interface CoreChanges {
	onCoreChanged(listener: () => void): () => void;
}

export interface AppHostConfig {
	readonly tauri?: {
		readonly coreChanges: CoreChanges;
	};
}
