import type { KeptWorkspaces, Workspace, WorkspaceIcon } from "@widgetarium/workspaces";
import { WorkspacesGateway } from "@widgetarium/workspaces/gateways";
import type { WorkspaceClient } from "./workspace-client.js";
import type { WorkspaceEntry } from "./workspace-docs.js";
import { isFolderMissing } from "./tauri-workspace-apps.js";
import type { HeldLooks } from "./workspace-looks.js";

export interface TauriWorkspacesAsk {
	readonly workspaces: WorkspaceClient;
	readonly looks: HeldLooks;
	readonly entries: readonly WorkspaceEntry[];
	readonly currentId: string;
	readonly reopen: () => Promise<void>;
}

export class TauriWorkspacesGateway extends WorkspacesGateway {
	private renaming: Promise<void> = Promise.resolve();
	private readonly latestNames = new Map<string, string>();

	constructor(private readonly ask: TauriWorkspacesAsk) {
		super();
		this.keepSeenOrder();
	}

	kept(): KeptWorkspaces {
		const { looks, entries, currentId } = this.ask;
		const { order } = looks.now();
		const byId = new Map(entries.map((entry) => [entry.id, entry]));
		return {
			workspaces: order.flatMap((id) => {
				const entry = byId.get(id);
				return entry === undefined ? [] : [this.workspaceOf(entry)];
			}),
			currentId,
		};
	}

	rename(id: string, name: string): Promise<void> {
		this.latestNames.set(id, name);
		this.renaming = this.renaming.then(() => this.writeLatestName(id));
		return this.renaming;
	}

	keepIcon(id: string, icon: WorkspaceIcon | null): Promise<void> {
		const others = Object.entries(this.ask.looks.now().icons).filter(([kept]) => kept !== id);
		const icons = Object.fromEntries(icon === null ? others : [...others, [id, icon]]);
		this.ask.looks.change({ icons }, `icon of ${id}`);
		return Promise.resolve();
	}

	async create(name: string): Promise<Workspace> {
		const entry = await this.ask.workspaces.create(name);
		this.ask.looks.change({ order: [...this.ask.looks.now().order, entry.id] }, `new workspace ${entry.id}`);
		return this.workspaceOf(entry);
	}

	async open(id: string): Promise<void> {
		const opened = await this.ask.workspaces.markOpened(id);
		if (isFolderMissing(opened)) {
			await this.ask.workspaces.attachFolder(id);
		}

		await this.ask.reopen();
	}

	private keepSeenOrder(): void {
		const kept = this.ask.looks.now().order;
		const order = orderOf(kept, this.ask.entries);
		if (order.join() !== kept.join()) {
			this.ask.looks.change({ order }, `workspace order ${kept.length} → ${order.length}`);
		}
	}

	private async writeLatestName(id: string): Promise<void> {
		const name = this.latestNames.get(id);
		if (name === undefined) {
			return;
		}

		this.latestNames.delete(id);
		await this.ask.workspaces.rename(id, name);
	}

	private workspaceOf(entry: WorkspaceEntry): Workspace {
		return {
			id: entry.id,
			name: entry.name,
			icon: this.ask.looks.now().icons[entry.id] ?? null,
		};
	}
}

function orderOf(kept: readonly string[], entries: readonly WorkspaceEntry[]): string[] {
	const known = new Set(entries.map((entry) => entry.id));
	const stillThere = kept.filter((id) => known.has(id));
	const unseen = [...entries]
		.filter((entry) => !stillThere.includes(entry.id))
		.sort((one, other) => one.lastOpenedAt - other.lastOpenedAt)
		.map((entry) => entry.id);
	return [...stillThere, ...unseen];
}
