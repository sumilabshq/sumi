import type { KeptWorkspaces, Workspace, WorkspaceIcon } from "../schema/workspace.schema.js";
import { untitledNameAfter } from "./untitled-name.js";
import { Watchers } from "./watchers.js";

export interface WorkspacesMoment {
	readonly workspaces: readonly Workspace[];
	readonly currentId: string;
	readonly openingId: string | null;
}

const NO_NAME = "A workspace needs a name.";
const UNKNOWN = "There is no workspace {id}.";

export class WorkspacesStore {
	private readonly watchers = new Watchers();
	private moment: WorkspacesMoment;

	constructor(kept: KeptWorkspaces) {
		this.moment = {
			...kept,
			openingId: null,
		};
	}

	now = (): WorkspacesMoment => this.moment;

	watch = (changed: () => void): (() => void) => this.watchers.watch(changed);

	current(): Workspace {
		return this.workspaceOf(this.moment.currentId);
	}

	nextUntitledName(): string {
		return untitledNameAfter(this.moment.workspaces.map((workspace) => workspace.name));
	}

	rename(id: string, name: string): string | null {
		const trimmed = name.trim();
		if (trimmed === "") {
			return NO_NAME;
		}

		this.become(
			this.withChanged(id, (workspace) => ({ ...workspace, name: trimmed })),
			`rename ${id} to ${trimmed}`,
		);
		return null;
	}

	setIcon(id: string, icon: WorkspaceIcon | null): void {
		this.become(
			this.withChanged(id, (workspace) => ({ ...workspace, icon })),
			`icon of ${id} → ${JSON.stringify(icon)}`,
		);
	}

	add(workspace: Workspace): void {
		this.become(
			{
				...this.moment,
				workspaces: [...this.moment.workspaces.filter((kept) => kept.id !== workspace.id), workspace],
			},
			`add ${workspace.name} (${workspace.id})`,
		);
	}

	open(id: string): void {
		this.workspaceOf(id);
		this.become({ ...this.moment, openingId: id }, `opening ${id}`);
	}

	finishOpening(id: string): void {
		this.workspaceOf(id);
		this.become({ ...this.moment, currentId: id, openingId: null }, `opened ${id}`);
	}

	private workspaceOf(id: string): Workspace {
		const found = this.moment.workspaces.find((workspace) => workspace.id === id);
		if (found === undefined) {
			throw new Error(UNKNOWN.replace("{id}", id));
		}

		return found;
	}

	private withChanged(id: string, step: (workspace: Workspace) => Workspace): WorkspacesMoment {
		this.workspaceOf(id);
		return {
			...this.moment,
			workspaces: this.moment.workspaces.map((workspace) => (workspace.id === id ? step(workspace) : workspace)),
		};
	}

	private become(next: WorkspacesMoment, reason: string): void {
		if (JSON.stringify(next) === JSON.stringify(this.moment)) {
			return;
		}

		console.info(`[widgetarium] workspaces ${summaryOf(this.moment)} → ${summaryOf(next)} (${reason})`);
		this.moment = next;
		this.watchers.tell();
	}
}

function summaryOf({ workspaces, currentId, openingId }: WorkspacesMoment): string {
	return `${workspaces.length} kept, current ${currentId}, opening ${openingId ?? "none"}`;
}
