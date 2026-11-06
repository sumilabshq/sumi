export interface BrowserPagesIpc {
	invoke(command: string, args?: Readonly<Record<string, unknown>>): Promise<unknown>;
	channel(onMessage: (message: unknown) => void): unknown;
}

export interface BrowserConfig {
	readonly tauri?: {
		readonly ipc: BrowserPagesIpc;
	};
}
