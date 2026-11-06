import { z } from "zod";
import { GLOBAL_ROOT, HeldDoc, callStore, validEntriesOf, validValuesOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, Invoke, StoreClient } from "@widgetarium/behaviors/tauri-store";
import { WorkspaceIconSchema } from "../../shared/schema/workspace.schema.js";
import type { Workspace, WorkspaceFolder, WorkspaceIcon } from "../../shared/schema/workspace.schema.js";
import { WorkspacesGateway } from "./workspaces.gateway.js";

// TODO: one entry schema; apps/tauri keeps its own WorkspaceEntrySchema
export const KeptWorkspaceEntrySchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	folder: z.string().nullable(),
	folderFound: z.boolean(),
	lastOpenedAt: z.number().int().nonnegative(),
});

type KeptWorkspaceEntry = z.infer<typeof KeptWorkspaceEntrySchema>;

export const KeptLooksSchema = z.looseObject({
	order: z.array(z.string()).default([]),
	icons: z.record(z.string(), WorkspaceIconSchema).default({}),
});

type KeptLooks = z.infer<typeof KeptLooksSchema>;

const KEPT_LOOKS: DocKind<KeptLooks> = {
	file: "workspace-looks.json",
	v: 1,
	schema: KeptLooksSchema,
	salvage: KeptLooksSchema.extend({
		order: validEntriesOf(z.string()),
		icons: validValuesOf(WorkspaceIconSchema),
	}),
};

export class TauriWorkspacesGateway extends WorkspacesGateway {
	private readonly listeners = new Set<() => void>();
	private readonly latestNames = new Map<string, string>();
	private readonly landed: Promise<HeldDoc<KeptLooks>>;
	private renaming: Promise<void> = Promise.resolve();
	private entries: readonly KeptWorkspaceEntry[] = [];
	private looks: HeldDoc<KeptLooks> | null = null;

	constructor(
		private readonly invoke: Invoke,
		store: StoreClient,
	) {
		super();
		this.landed = this.read(store);
		this.landed.catch((failure: unknown) => console.error("[widgetarium] workspaces could not be read", failure));
	}

	workspaces(): readonly Workspace[] {
		const looks = this.looks?.now();

		if (looks === undefined) {
			return [];
		}

		const byId = new Map(this.entries.map((entry) => [entry.id, entry]));
		return looks.order.flatMap((id) => {
			const entry = byId.get(id);
			return entry === undefined ? [] : [workspaceOf(entry, looks)];
		});
	}

	workspacesChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	saveWorkspaceName(id: string, name: string): Promise<void> {
		this.entries = this.entries.map((entry) => (entry.id === id ? { ...entry, name } : entry));
		this.tell();
		this.latestNames.set(id, name);
		this.renaming = this.renaming.then(() => this.writeLatestName(id));
		return this.renaming;
	}

	async saveWorkspaceIcon(id: string, icon: WorkspaceIcon | null, reason: string): Promise<void> {
		const looks = await this.landed;
		const others = Object.entries(looks.now().icons).filter(([kept]) => kept !== id);
		looks.change({ icons: Object.fromEntries(icon === null ? others : [...others, [id, icon]]) }, reason);
		await looks.flush();
	}

	async createWorkspace(name: string): Promise<Workspace> {
		const looks = await this.landed;
		const entry = KeptWorkspaceEntrySchema.parse(await callStore(this.invoke, "create_workspace", { name }));
		this.entries = [...this.entries, entry];
		looks.change({ order: [...looks.now().order, entry.id] }, `new workspace ${entry.id}`);
		await looks.flush();
		return workspaceOf(entry, looks.now());
	}

	async markWorkspaceOpened(id: string): Promise<WorkspaceFolder> {
		const entry = KeptWorkspaceEntrySchema.parse(await callStore(this.invoke, "mark_workspace_opened", { id }));
		return {
			folder: entry.folder,
			isFolderFound: entry.folderFound,
		};
	}

	async attachWorkspaceFolder(id: string): Promise<void> {
		await callStore(this.invoke, "attach_workspace_folder", { id });
	}

	private async read(store: StoreClient): Promise<HeldDoc<KeptLooks>> {
		const [looks, entries] = await Promise.all([
			HeldDoc.read({
				store,
				root: GLOBAL_ROOT,
				kind: KEPT_LOOKS,
				empty: KeptLooksSchema.parse({}),
			}),
			callStore(this.invoke, "list_workspaces", {}),
		]);
		this.entries = KeptWorkspaceEntrySchema.array().parse(entries);
		this.looks = looks;
		keepSeenOrder(looks, this.entries);
		looks.watch(() => this.tell());
		this.tell();
		return looks;
	}

	private async writeLatestName(id: string): Promise<void> {
		const name = this.latestNames.get(id);

		if (name === undefined) {
			return;
		}

		this.latestNames.delete(id);
		await callStore(this.invoke, "rename_workspace", { id, name });
	}

	private tell(): void {
		for (const listener of [...this.listeners]) {
			listener();
		}
	}
}

function workspaceOf(entry: KeptWorkspaceEntry, looks: KeptLooks): Workspace {
	return {
		id: entry.id,
		name: entry.name,
		icon: looks.icons[entry.id] ?? null,
	};
}

function keepSeenOrder(looks: HeldDoc<KeptLooks>, entries: readonly KeptWorkspaceEntry[]): void {
	const kept = looks.now().order;
	const order = seenOrderOf(kept, entries);

	if (order.join() === kept.join()) {
		return;
	}

	looks.change({ order }, `workspace order ${kept.length} → ${order.length}`);
	void looks.flush();
}

function seenOrderOf(kept: readonly string[], entries: readonly KeptWorkspaceEntry[]): string[] {
	const known = new Set(entries.map((entry) => entry.id));
	const stillThere = kept.filter((id) => known.has(id));
	const unseen = [...entries]
		.filter((entry) => !stillThere.includes(entry.id))
		.sort((one, other) => one.lastOpenedAt - other.lastOpenedAt)
		.map((entry) => entry.id);
	return [...stillThere, ...unseen];
}
