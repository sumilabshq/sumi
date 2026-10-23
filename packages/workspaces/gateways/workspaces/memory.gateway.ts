import type { KeptWorkspaces, Workspace } from "../../shared/schema/workspace.schema.js";
import { WorkspacesGateway } from "./workspaces.gateway.js";

export class MemoryWorkspacesGateway extends WorkspacesGateway {
	constructor(private readonly first: KeptWorkspaces) {
		super();
	}

	kept(): KeptWorkspaces {
		return this.first;
	}

	rename(): Promise<void> {
		return Promise.resolve();
	}

	keepIcon(): Promise<void> {
		return Promise.resolve();
	}

	create(name: string): Promise<Workspace> {
		return Promise.resolve({
			id: crypto.randomUUID(),
			name,
			icon: null,
		});
	}

	open(): Promise<void> {
		return Promise.resolve();
	}
}
