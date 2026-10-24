import type { WorkspaceFolder, WorkspaceFolders } from "../../shared/host/workspace-folders.host.js";
import { WorkingFoldersGateway } from "./working-folders.gateway.js";

export class ClientWorkingFoldersGateway extends WorkingFoldersGateway {
	private held: WorkspaceFolder;

	constructor(private readonly workspace: WorkspaceFolders) {
		super();
		this.held = workspace.opened;
	}

	workspaceFolder(): WorkspaceFolder {
		return this.held;
	}

	saveWorkspaceFolder(next: WorkspaceFolder): void {
		this.held = next;
	}

	chosenFolder(workspaceId: string, path: string): Promise<WorkspaceFolder> {
		return this.workspace.client.chooseFolder(workspaceId, path);
	}

	attachedPickedFolder(workspaceId: string): Promise<WorkspaceFolder | null> {
		return this.workspace.client.attachFolder(workspaceId);
	}
}
