import type { FileDiff } from "@sumi/git";

export type FileTreeRow =
	| {
			readonly kind: "folder";
			readonly path: string;
			readonly name: string;
			readonly depth: number;
			readonly isOpen: boolean;
			readonly added: number;
			readonly removed: number;
	  }
	| {
			readonly kind: "file";
			readonly file: FileDiff;
			readonly depth: number;
	  };

interface FolderNode {
	readonly name: string;
	readonly path: string;
	readonly folders: Map<string, FolderNode>;
	readonly files: FileDiff[];
}

const SLASH = "/";

export function fileTreeRowsOf(files: readonly FileDiff[], closed: ReadonlySet<string>): FileTreeRow[] {
	const root = folderNodeOf("", "");

	for (const file of files) {
		placedIn(root, file);
	}

	return rowsOf(root, 0, closed);
}

function folderNodeOf(name: string, path: string): FolderNode {
	return {
		name,
		path,
		folders: new Map(),
		files: [],
	};
}

function placedIn(root: FolderNode, file: FileDiff): void {
	const parts = file.path.split(SLASH);
	let folder = root;

	for (const part of parts.slice(0, -1)) {
		const path = folder.path === "" ? part : `${folder.path}${SLASH}${part}`;
		const known = folder.folders.get(part) ?? folderNodeOf(part, path);
		folder.folders.set(part, known);
		folder = known;
	}

	folder.files.push(file);
}

function rowsOf(folder: FolderNode, depth: number, closed: ReadonlySet<string>): FileTreeRow[] {
	const folders = [...folder.folders.values()].map(joinedChain).sort(byName);
	const files = [...folder.files].sort((a, b) => a.path.localeCompare(b.path));
	return [
		...folders.flatMap((child) => folderRowsOf(child, depth, closed)),
		...files.map((file) => ({ kind: "file" as const, file, depth })),
	];
}

function folderRowsOf(folder: FolderNode, depth: number, closed: ReadonlySet<string>): FileTreeRow[] {
	const isOpen = !closed.has(folder.path);
	const counts = countsOf(folder);
	const row: FileTreeRow = {
		kind: "folder",
		path: folder.path,
		name: folder.name,
		depth,
		isOpen,
		added: counts.added,
		removed: counts.removed,
	};
	return isOpen ? [row, ...rowsOf(folder, depth + 1, closed)] : [row];
}

function joinedChain(folder: FolderNode): FolderNode {
	const [only] = folder.folders.values();

	if (folder.files.length > 0 || folder.folders.size !== 1 || only === undefined) {
		return folder;
	}

	return joinedChain({ ...only, name: `${folder.name}${SLASH}${only.name}` });
}

function countsOf(folder: FolderNode): { added: number; removed: number } {
	const own = folder.files.reduce(
		(sum, file) => ({ added: sum.added + file.added, removed: sum.removed + file.removed }),
		{ added: 0, removed: 0 },
	);
	return [...folder.folders.values()].map(countsOf).reduce(
		(sum, child) => ({ added: sum.added + child.added, removed: sum.removed + child.removed }),
		own,
	);
}

function byName(a: FolderNode, b: FolderNode): number {
	return a.name.localeCompare(b.name);
}
