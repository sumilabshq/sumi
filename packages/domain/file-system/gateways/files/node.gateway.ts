import fs from "node:fs/promises";
import nodePath from "node:path";
import type { FileInfo, FolderEntry } from "../../shared/schema/files.schema.js";
import { FilesGateway } from "./files.gateway.js";

const ABSENT: FileInfo = {
	exists: false,
	kind: null,
	size: null,
	modifiedMs: null,
};

export class NodeFilesGateway extends FilesGateway {
	constructor(
		private readonly appData: string,
		workspaceId: string,
	) {
		super(workspaceId);
	}

	override appDataFolder(): Promise<string> {
		return Promise.resolve(this.appData);
	}

	override readFile(path: string): Promise<string> {
		return fs.readFile(path, "utf8");
	}

	override async readFolder(path: string): Promise<readonly FolderEntry[]> {
		const entries = await fs.readdir(path, { withFileTypes: true });
		return entries
			.map((entry) => ({
				name: entry.name,
				kind: entry.isDirectory() ? ("folder" as const) : ("file" as const),
			}))
			.sort((one, other) => one.name.localeCompare(other.name));
	}

	override async fileInfo(path: string): Promise<FileInfo> {
		const stat = await fs.stat(path).catch(() => null);

		if (stat === null) {
			return ABSENT;
		}

		return {
			exists: true,
			kind: stat.isDirectory() ? "folder" : "file",
			size: stat.size,
			modifiedMs: stat.mtimeMs,
		};
	}

	override async writeFile(path: string, content: string): Promise<void> {
		await fs.mkdir(nodePath.dirname(path), { recursive: true });
		await fs.writeFile(path, content);
	}

	override async appendFile(path: string, content: string): Promise<void> {
		await fs.mkdir(nodePath.dirname(path), { recursive: true });
		await fs.appendFile(path, content);
	}

	override async makeFolder(path: string): Promise<void> {
		await fs.mkdir(path, { recursive: true });
	}

	override remove(path: string): Promise<void> {
		return fs.rm(path, { recursive: true, force: true });
	}

	override async rename(from: string, to: string): Promise<void> {
		await fs.mkdir(nodePath.dirname(to), { recursive: true });
		await fs.rename(from, to);
	}

	override async copy(from: string, to: string): Promise<void> {
		await fs.mkdir(nodePath.dirname(to), { recursive: true });
		await fs.cp(from, to, { recursive: true });
	}
}
