import type { FileInfo, FolderEntry } from "../../shared/schema/files.schema.js";
import { FilesGateway } from "./files.gateway.js";

const MISSING = "{path} does not exist";
const NOT_A_FILE = "{path} is a folder, not a file";

const ABSENT: FileInfo = {
	exists: false,
	kind: null,
	size: null,
	modifiedMs: null,
	identity: null,
};

export class MemoryFilesGateway extends FilesGateway {
	private readonly files = new Map<string, string>();
	private readonly folders = new Set<string>();

	constructor(
		private readonly appData: string,
		workspaceId: string,
	) {
		super(workspaceId);
	}

	override appDataFolder(): Promise<string> {
		return Promise.resolve(this.appData);
	}

	override async readFile(path: string): Promise<string> {
		const content = this.files.get(path);

		if (content !== undefined) {
			return content;
		}

		throw new Error((this.folders.has(path) ? NOT_A_FILE : MISSING).replace("{path}", path));
	}

	override async readFileBytes(path: string): Promise<string> {
		const bytes = new TextEncoder().encode(await this.readFile(path));
		return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
	}

	override async openInSystemApp(path: string): Promise<void> {
		await this.readFile(path);
	}

	override async readFolder(path: string): Promise<readonly FolderEntry[]> {
		if (!this.folders.has(path)) {
			throw new Error(MISSING.replace("{path}", path));
		}

		const files = [...this.files.keys()].filter((held) => parentOf(held) === path).map((held) => entryOf(held, "file"));
		const folders = [...this.folders].filter((held) => parentOf(held) === path).map((held) => entryOf(held, "folder"));
		return [...files, ...folders].sort((one, other) => one.name.localeCompare(other.name));
	}

	override async fileInfo(path: string): Promise<FileInfo> {
		const content = this.files.get(path);

		if (content !== undefined) {
			return {
				exists: true,
				kind: "file",
				size: content.length,
				modifiedMs: null,
				identity: null,
			};
		}

		return this.folders.has(path) ? { ...ABSENT, exists: true, kind: "folder" } : ABSENT;
	}

	override async writeFile(path: string, content: string): Promise<void> {
		this.makeParents(path);
		this.files.set(path, content);
	}

	override async appendFile(path: string, content: string): Promise<void> {
		this.makeParents(path);
		this.files.set(path, (this.files.get(path) ?? "") + content);
	}

	override async makeFolder(path: string): Promise<void> {
		this.makeParents(path);
		this.folders.add(path);
	}

	override async remove(path: string): Promise<void> {
		for (const held of [...this.files.keys(), ...this.folders]) {
			if (isWithin(held, path)) {
				this.files.delete(held);
				this.folders.delete(held);
			}
		}
	}

	override async rename(from: string, to: string): Promise<void> {
		await this.copy(from, to);
		await this.remove(from);
	}

	override async copy(from: string, to: string): Promise<void> {
		if (!this.files.has(from) && !this.folders.has(from)) {
			throw new Error(MISSING.replace("{path}", from));
		}

		this.makeParents(to);
		const movedTo = (held: string): string => to + held.slice(from.length);
		const files = [...this.files].filter(([held]) => isWithin(held, from));
		const folders = [...this.folders].filter((held) => isWithin(held, from));
		files.forEach(([held, content]) => this.files.set(movedTo(held), content));
		folders.forEach((held) => this.folders.add(movedTo(held)));
	}

	private makeParents(path: string): void {
		for (let parent = parentOf(path); parent !== "" && parent !== "/"; parent = parentOf(parent)) {
			this.folders.add(parent);
		}
	}

	override locatedFile(): Promise<string | null> {
		return Promise.resolve(null);
	}
}

function parentOf(path: string): string {
	return path.slice(0, path.lastIndexOf("/"));
}

function entryOf(path: string, kind: FolderEntry["kind"]): FolderEntry {
	return {
		name: path.slice(path.lastIndexOf("/") + 1),
		kind,
	};
}

function isWithin(held: string, path: string): boolean {
	return held === path || held.startsWith(`${path}/`);
}
