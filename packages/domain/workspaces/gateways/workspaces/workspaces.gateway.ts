import type { Workspace, WorkspaceFolder, WorkspaceIcon } from "../../shared/schema/workspace.schema.js";

export abstract class WorkspacesGateway {
	abstract workspaces(): readonly Workspace[];
	abstract workspacesChanged(listener: () => void): () => void;
	abstract saveWorkspaceName(id: string, name: string, reason: string): Promise<void>;
	abstract saveWorkspaceIcon(id: string, icon: WorkspaceIcon | null, reason: string): Promise<void>;
	abstract createWorkspace(name: string): Promise<Workspace>;
	abstract markWorkspaceOpened(id: string): Promise<WorkspaceFolder>;
	abstract attachWorkspaceFolder(id: string): Promise<void>;
}
