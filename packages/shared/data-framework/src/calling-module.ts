export interface CallingModule {
	readonly module: string;
	readonly prefix: string | null;
	readonly importedModuleNames: readonly string[];
	readonly owner: string;
}
