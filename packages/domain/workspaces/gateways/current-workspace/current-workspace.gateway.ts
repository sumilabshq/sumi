import type { CurrentWorkspace } from "../../shared/schema/workspace.schema.js";

export abstract class CurrentWorkspaceGateway {
	abstract currentWorkspace(): CurrentWorkspace;
	abstract saveCurrentWorkspace(current: CurrentWorkspace, reason: string): void;
	abstract currentWorkspaceChanged(listener: () => void): () => void;
}
