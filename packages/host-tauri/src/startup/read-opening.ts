import { SETTINGS, readSettings } from "../settings/settings-doc.js";
import type { HeldSettings } from "../settings/settings-doc.js";
import { GLOBAL_ROOT } from "../store/store-client.js";
import type { StoreClient } from "../store/store-client.js";
import { StoreRefusedError } from "../store/store-invoke.js";
import type { WorkspaceClient } from "../workspace/workspace-client.js";
import { WORKSPACE_FILE, WORKSPACES } from "../workspace/workspace-docs.js";
import type { WorkspaceEntry } from "../workspace/workspace-docs.js";

export interface Opening {
	readonly settings: HeldSettings;
	readonly workspace: WorkspaceEntry;
}

export async function readOpening(store: StoreClient, workspaces: WorkspaceClient): Promise<Opening> {
	const [settings, registry] = await Promise.all([
		timedRead(SETTINGS.file, () => readSettings(store)),
		timedRead(WORKSPACES.file, () => store.readDoc(GLOBAL_ROOT, WORKSPACES)),
	]);
	const lastId = registry.doc?.lastOpenedId ?? null;
	const workspace = await timedRead(WORKSPACE_FILE, () => workspaceToOpen(workspaces, lastId));
	if (workspace.folder !== null && !workspace.folderFound) {
		console.warn(`[ink] workspace ${workspace.name}: folder not found at ${workspace.folder}`);
	}

	return {
		settings,
		workspace,
	};
}

async function workspaceToOpen(workspaces: WorkspaceClient, lastId: string | null): Promise<WorkspaceEntry> {
	if (lastId === null) {
		return workspaces.openFirst();
	}

	try {
		return await workspaces.markOpened(lastId);
	} catch (failure: unknown) {
		if (!(failure instanceof StoreRefusedError) || failure.refusal.code !== "no-workspace") {
			throw failure;
		}

		console.warn(`[ink] the last workspace ${lastId} is gone, opening the first one`);
		return workspaces.openFirst();
	}
}

async function timedRead<Answer>(file: string, read: () => Promise<Answer>): Promise<Answer> {
	const startedAt = performance.now();
	const answer = await read();
	console.info(`[ink] startup read ${file} in ${Math.round(performance.now() - startedAt)}ms`);
	return answer;
}
