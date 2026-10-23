import type { KeptWorkspaces, Workspace, WorkspaceIcon } from "../../shared/schema/workspace.schema.js";

export abstract class WorkspacesGateway {
	abstract kept(): KeptWorkspaces;
	abstract rename(id: string, name: string): Promise<void>;
	abstract keepIcon(id: string, icon: WorkspaceIcon | null): Promise<void>;
	abstract create(name: string): Promise<Workspace>;
	abstract open(id: string): Promise<void>;
}
