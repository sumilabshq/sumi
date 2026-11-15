import type { Workspace, WorkspaceFolder, WorkspaceIcon, WorkspaceInk } from "../../shared/schema/workspace.schema.js";
import { WorkspacesGateway } from "./workspaces.gateway.js";

const PICKED_FOLDER = "Untitled {n}";
const PICKED_FOLDER_NAME = /^Untitled (\d+)$/;

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

	saveWorkspaceInk(id: string, ink: WorkspaceInk): Promise<void> {
		this.keep(this.held.map((workspace) => (workspace.id === id ? { ...workspace, ink } : workspace)));
		return Promise.resolve();
	}

	createWorkspace(): Promise<Workspace | null> {
		const created: Workspace = {
			id: crypto.randomUUID(),
			name: pickedFolderNameAfter(this.held.map((workspace) => workspace.name)),
			icon: null,
			ink: "yellow",
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

function pickedFolderNameAfter(names: readonly string[]): string {
	const taken = new Set(names.flatMap((name) => pickedNumberIn(name)));
	const free = Array.from({ length: taken.size + 1 }, (_, at) => at + 1).find((n) => !taken.has(n)) ?? 1;
	return PICKED_FOLDER.replace("{n}", String(free));
}

function pickedNumberIn(name: string): number[] {
	const found = PICKED_FOLDER_NAME.exec(name.trim());
	return found?.[1] === undefined ? [] : [Number(found[1])];
}
