import { WorkingFolderGateway } from "@widgetarium/assistant/gateways";
import type { WorkingFolders } from "@widgetarium/assistant";
import type { WorkspaceClient } from "./workspace-client.js";
import type { WorkspaceEntry } from "./workspace-docs.js";

export class TauriWorkingFolderGateway extends WorkingFolderGateway {
	private readonly watchers = new Set<() => void>();

	constructor(
		private readonly workspaces: WorkspaceClient,
		private entry: WorkspaceEntry,
	) {
		super();
	}

	folders(): Promise<WorkingFolders> {
		const current = this.entry.folderFound ? this.entry.folder : null;
		return Promise.resolve({
			workspace: this.entry.name,
			current,
			recent: recentOf(this.entry.recentFolders, current),
		});
	}

	watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	async choose(path: string): Promise<void> {
		this.become(await this.workspaces.chooseFolder(this.entry.id, path), `chose ${path}`);
	}

	async pickAnother(): Promise<void> {
		const picked = await this.workspaces.attachFolder(this.entry.id);

		if (picked === null) {
			return;
		}

		this.become(picked, "picked another folder");
	}

	private become(next: WorkspaceEntry, reason: string): void {
		console.info(`[ink] working folder ${String(this.entry.folder)} → ${String(next.folder)} (${reason})`);
		this.entry = next;
		for (const changed of [...this.watchers]) {
			changed();
		}
	}
}

function recentOf(recent: readonly string[], current: string | null): string[] {
	if (recent.length > 0 || current === null) {
		return [...recent];
	}

	return [current];
}
