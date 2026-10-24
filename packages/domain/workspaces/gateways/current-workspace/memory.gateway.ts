import type { CurrentWorkspace } from "../../shared/schema/workspace.schema.js";
import { CurrentWorkspaceGateway } from "./current-workspace.gateway.js";

export class MemoryCurrentWorkspaceGateway extends CurrentWorkspaceGateway {
	private readonly listeners = new Set<() => void>();

	constructor(private held: CurrentWorkspace) {
		super();
	}

	currentWorkspace(): CurrentWorkspace {
		return this.held;
	}

	saveCurrentWorkspace(current: CurrentWorkspace): void {
		this.held = current;
		for (const listener of [...this.listeners]) {
			listener();
		}
	}

	currentWorkspaceChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
