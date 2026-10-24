import type { WorkspaceFolder } from "../../shared/host/workspace-folders.host.js";

export abstract class WorkingFoldersGateway {
	abstract workspaceFolder(): WorkspaceFolder | null;
	abstract saveWorkspaceFolder(next: WorkspaceFolder): void;
	abstract chosenFolder(workspaceId: string, path: string): Promise<WorkspaceFolder>;
	abstract attachedPickedFolder(workspaceId: string): Promise<WorkspaceFolder | null>;
}
