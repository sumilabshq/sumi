import type { WorkspaceFolder, WorkspaceFolders } from "../../shared/host/workspace-folders.host.js";
import { WorkingFoldersGateway } from "./working-folders.gateway.js";

export class ClientWorkingFoldersGateway extends WorkingFoldersGateway {
	constructor(private readonly workspace: WorkspaceFolders) {
		super();
	}

	workspaceFolder(): WorkspaceFolder {
		return this.workspace.folder.value();
	}

	saveWorkspaceFolder(next: WorkspaceFolder): void {
		this.workspace.folder.save(next);
	}

	chosenFolder(workspaceId: string, path: string): Promise<WorkspaceFolder> {
		return this.workspace.client.chooseFolder(workspaceId, path);
	}

	attachedPickedFolder(workspaceId: string): Promise<WorkspaceFolder | null> {
		return this.workspace.client.attachFolder(workspaceId);
	}

	workingFolderChanged(listener: () => void): () => void {
		return this.workspace.folder.changed(listener);
	}
}
