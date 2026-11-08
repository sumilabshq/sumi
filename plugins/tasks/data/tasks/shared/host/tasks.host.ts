export interface BoardFile {
	readonly read: () => Promise<string | null>;
	readonly write: (text: string) => Promise<void>;
}

export interface TasksConfig {
	readonly file: BoardFile;
}
