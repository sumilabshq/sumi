import type { ModuleFacts } from "@widgetarium/framework";
import type { FilesGateway } from "../files/files.gateway.js";
import { MemoryFilesGateway } from "../files/memory.gateway.js";
import { TauriFilesGateway } from "../files/tauri.gateway.js";

export type FileSystemParts = {
	readonly files: FilesGateway;
};

const FILES_STORE = "FILES_STORE";
const TAURI_FILES_STORE = "tauri";
const MEMORY_APP_DATA = "/app-data-in-memory";

export function fileSystemPartsOn({ env, scope }: ModuleFacts): FileSystemParts {
	if (env[FILES_STORE] === TAURI_FILES_STORE) {
		return {
			files: new TauriFilesGateway(scope.workspaceId),
		};
	}

	return {
		files: new MemoryFilesGateway(MEMORY_APP_DATA, scope.workspaceId),
	};
}
