import { invoke } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import { z } from "zod";
import { FileInfoSchema, FolderEntrySchema } from "../../shared/schema/files.schema.js";
import type { FileInfo, FolderEntry } from "../../shared/schema/files.schema.js";
import { FilesGateway } from "./files.gateway.js";

const FILES = "plugin:files|";

const DoneSchema = z.null();

export class TauriFilesGateway extends FilesGateway {
	override appDataFolder(): Promise<string> {
		return appDataDir();
	}

	override async readFile(path: string): Promise<string> {
		return z.string().parse(await invoke(`${FILES}read_file`, { path }));
	}

	override async readFolder(path: string): Promise<readonly FolderEntry[]> {
		return z.array(FolderEntrySchema).parse(await invoke(`${FILES}read_folder`, { path }));
	}

	override async fileInfo(path: string): Promise<FileInfo> {
		return FileInfoSchema.parse(await invoke(`${FILES}file_info`, { path }));
	}

	override async writeFile(path: string, content: string): Promise<void> {
		DoneSchema.parse(await invoke(`${FILES}write_file`, { path, content }));
	}

	override async appendFile(path: string, content: string): Promise<void> {
		DoneSchema.parse(await invoke(`${FILES}append_file`, { path, content }));
	}

	override async makeFolder(path: string): Promise<void> {
		DoneSchema.parse(await invoke(`${FILES}make_folder`, { path }));
	}

	override async remove(path: string): Promise<void> {
		DoneSchema.parse(await invoke(`${FILES}remove`, { path }));
	}

	override async rename(from: string, to: string): Promise<void> {
		DoneSchema.parse(await invoke(`${FILES}rename`, { from, to }));
	}

	override async copy(from: string, to: string): Promise<void> {
		DoneSchema.parse(await invoke(`${FILES}copy`, { from, to }));
	}
}
