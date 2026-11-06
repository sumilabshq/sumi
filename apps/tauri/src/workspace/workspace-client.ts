import { callStore } from "@widgetarium/behaviors/tauri-store";
import type { Invoke } from "@widgetarium/behaviors/tauri-store";
import { WorkspaceEntrySchema } from "./workspace-docs.js";
import type { WorkspaceEntry } from "./workspace-docs.js";

export class WorkspaceClient {
	constructor(private readonly invoke: Invoke) {}

	async openFirst(): Promise<WorkspaceEntry> {
		return WorkspaceEntrySchema.parse(await callStore(this.invoke, "open_first_workspace", {}));
	}

	async create(name: string): Promise<WorkspaceEntry> {
		return WorkspaceEntrySchema.parse(await callStore(this.invoke, "create_workspace", { name }));
	}

	async attachFolder(id: string): Promise<WorkspaceEntry | null> {
		return WorkspaceEntrySchema.nullable().parse(await callStore(this.invoke, "attach_workspace_folder", { id }));
	}

	async chooseFolder(id: string, folder: string): Promise<WorkspaceEntry> {
		return WorkspaceEntrySchema.parse(await callStore(this.invoke, "choose_workspace_folder", { id, folder }));
	}

	async list(): Promise<readonly WorkspaceEntry[]> {
		return WorkspaceEntrySchema.array().parse(await callStore(this.invoke, "list_workspaces", {}));
	}

	async rename(id: string, name: string): Promise<void> {
		await callStore(this.invoke, "rename_workspace", { id, name });
	}

	async markOpened(id: string): Promise<WorkspaceEntry> {
		return WorkspaceEntrySchema.parse(await callStore(this.invoke, "mark_workspace_opened", { id }));
	}
}
