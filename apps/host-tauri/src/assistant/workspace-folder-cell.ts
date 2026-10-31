export interface WorkspaceFolderCell<Folder> {
	value(): Folder;
	save(next: Folder): void;
	changed(listener: () => void): () => void;
}

export function workspaceFolderCell<Folder>(first: Folder): WorkspaceFolderCell<Folder> {
	const listeners = new Set<() => void>();
	const held = { folder: first };
	return {
		value: () => held.folder,
		save: (next) => {
			held.folder = next;
			for (const listener of [...listeners]) {
				listener();
			}
		},
		changed: (listener) => {
			listeners.add(listener);
			return () => void listeners.delete(listener);
		},
	};
}
