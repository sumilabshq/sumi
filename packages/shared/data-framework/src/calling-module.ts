export interface CallingModule {
	readonly module: string;
	readonly importedModuleNames: readonly string[];
	readonly owner: string;
}
