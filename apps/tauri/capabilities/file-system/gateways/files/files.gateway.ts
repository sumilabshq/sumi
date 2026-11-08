import type { FileInfo, FolderEntry } from "../../shared/schema/files.schema.js";

export abstract class FilesGateway {
	constructor(readonly workspaceId: string) {}

	abstract appDataFolder(): Promise<string>;
	abstract readFile(path: string): Promise<string>;
	abstract readFileBytes(path: string): Promise<string>;
	abstract openInSystemApp(path: string): Promise<void>;
	abstract readFolder(path: string): Promise<readonly FolderEntry[]>;
	abstract fileInfo(path: string): Promise<FileInfo>;
	abstract writeFile(path: string, content: string): Promise<void>;
	abstract appendFile(path: string, content: string): Promise<void>;
	abstract makeFolder(path: string): Promise<void>;
	abstract remove(path: string): Promise<void>;
	abstract rename(from: string, to: string): Promise<void>;
	abstract copy(from: string, to: string): Promise<void>;
	abstract locatedFile(path: string, identity: string): Promise<string | null>;
	abstract pickedFolder(): Promise<string | null>;
}
