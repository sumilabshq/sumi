import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import nodePath from "node:path";
import { promisify } from "node:util";
import type { FileInfo, FolderEntry } from "../../shared/schema/files.schema.js";
import { FilesGateway } from "./files.gateway.js";

const ABSENT: FileInfo = {
	exists: false,
	kind: null,
	size: null,
	modifiedMs: null,
	identity: null,
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

	override async readFileBytes(path: string): Promise<string> {
		return (await fs.readFile(path)).toString("base64");
	}

	override async openInSystemApp(path: string): Promise<void> {
		await promisify(execFile)("open", [path]);
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
			identity: `${stat.dev}:${stat.ino}`,
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

	override async locatedFile(path: string, identity: string): Promise<string | null> {
		if ((await identityAt(path)) === identity) {
			return path;
		}

		const folder = nodePath.dirname(path);
		const names = await fs.readdir(folder).catch((): string[] => []);
		const identities = await Promise.all(names.map((name) => identityAt(nodePath.join(folder, name))));
		const at = identities.indexOf(identity);
		return at === -1 ? null : nodePath.join(folder, names[at] ?? "");
	}

	override pickedFolder(): Promise<string | null> {
		return Promise.resolve(null);
	}
}

async function identityAt(path: string): Promise<string | null> {
	const stat = await fs.lstat(path).catch(() => null);
	return stat === null ? null : `${stat.dev}:${stat.ino}`;
}
