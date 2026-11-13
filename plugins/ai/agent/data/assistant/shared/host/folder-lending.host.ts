export interface FolderLending {
	pick(): Promise<string | null>;
	lend(paths: readonly string[]): void;
}
