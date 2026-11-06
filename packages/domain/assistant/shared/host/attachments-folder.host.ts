export interface PrivateFolder {
	write(path: string, data: Uint8Array): void;
	remove(path: string): void;
	removeOlderThan(folder: string, ageMs: number, now: number): void;
}

export interface AttachmentsFolder {
	readonly folder: string | null;
	readonly files: PrivateFolder;
}
