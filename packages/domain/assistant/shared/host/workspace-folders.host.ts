import { isObject } from "@widgetarium/core/engine/is-object.js";
import { hostObject } from "@widgetarium/core/requests";

export interface WorkspaceFolder {
	readonly id: string;
	readonly name: string;
	readonly folder: string | null;
	readonly folderFound: boolean;
	readonly recentFolders: readonly string[];
}

export interface WorkspaceFolderClient {
	chooseFolder(id: string, folder: string): Promise<WorkspaceFolder>;
	attachFolder(id: string): Promise<WorkspaceFolder | null>;
}

export interface WorkspaceFolderCell {
	value(): WorkspaceFolder;
	save(next: WorkspaceFolder): void;
	changed(listener: () => void): () => void;
}

export interface WorkspaceFolders {
	readonly client: WorkspaceFolderClient;
	readonly folder: WorkspaceFolderCell;
}

export const WorkspaceFoldersHost = hostObject<WorkspaceFolders>("WorkspaceFolders", isWorkspaceFolders);

function isWorkspaceFolders(held: unknown): held is WorkspaceFolders {
	return isObject(held) && isObject(held["client"]) && isObject(held["folder"]);
}
