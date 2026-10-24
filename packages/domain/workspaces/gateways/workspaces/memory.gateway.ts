import type { Workspace, WorkspaceFolder, WorkspaceIcon } from "../../shared/schema/workspace.schema.js";
import { WorkspacesGateway } from "./workspaces.gateway.js";

const NO_FOLDER: WorkspaceFolder = {
	folder: null,
	isFolderFound: false,
};

export class MemoryWorkspacesGateway extends WorkspacesGateway {
	private readonly listeners = new Set<() => void>();

	constructor(private held: readonly Workspace[]) {
		super();
	}

	workspaces(): readonly Workspace[] {
		return this.held;
	}

	workspacesChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	saveWorkspaceName(id: string, name: string): Promise<void> {
		this.keep(this.held.map((workspace) => (workspace.id === id ? { ...workspace, name } : workspace)));
		return Promise.resolve();
	}

	saveWorkspaceIcon(id: string, icon: WorkspaceIcon | null): Promise<void> {
		this.keep(this.held.map((workspace) => (workspace.id === id ? { ...workspace, icon } : workspace)));
		return Promise.resolve();
	}

	createWorkspace(name: string): Promise<Workspace> {
		const created: Workspace = {
			id: crypto.randomUUID(),
			name,
			icon: null,
		};
		this.keep([...this.held, created]);
		return Promise.resolve(created);
	}

	markWorkspaceOpened(): Promise<WorkspaceFolder> {
		return Promise.resolve(NO_FOLDER);
	}

	attachWorkspaceFolder(): Promise<void> {
		return Promise.resolve();
	}

	private keep(workspaces: readonly Workspace[]): void {
		this.held = workspaces;
		for (const listener of [...this.listeners]) {
			listener();
		}
	}
}
