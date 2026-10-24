import type { HeldSettings } from "../settings/settings-doc.js";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { WorkspaceClient } from "../workspace/workspace-client.js";
import type { WorkspaceEntry } from "../workspace/workspace-docs.js";
import { readOpening } from "./read-opening.js";

export type OpeningState<Started> =
	| {
			readonly kind: "reading";
	  }
	| {
			readonly kind: "unopened";
			readonly failure: string;
	  }
	| {
			readonly kind: "opened";
			readonly started: Started;
			readonly workspace: WorkspaceEntry;
	  };

export interface OpeningParts<Started> {
	readonly store: StoreClient;
	readonly workspaces: WorkspaceClient;
	readonly openStudio: (settings: HeldSettings, workspace: WorkspaceEntry) => Promise<Started>;
}

type OpeningKind = OpeningState<unknown>["kind"];

const NEXT_KINDS: Readonly<Record<OpeningKind, readonly OpeningKind[]>> = {
	reading: ["unopened", "opened"],
	unopened: ["reading"],
	opened: [],
};

export class TauriOpening<Started> {
	private state: OpeningState<Started> = { kind: "reading" };
	private readonly listeners = new Set<() => void>();

	constructor(private readonly parts: OpeningParts<Started>) {}

	now = (): OpeningState<Started> => this.state;

	subscribe = (changed: () => void): (() => void) => {
		this.listeners.add(changed);
		return () => void this.listeners.delete(changed);
	};

	start = async (): Promise<void> => {
		try {
			const { settings, workspace } = await readOpening(this.parts.store, this.parts.workspaces);
			this.become(
				{
					kind: "opened",
					started: await this.parts.openStudio(settings, workspace),
					workspace,
				},
				`workspace ${workspace.name} (${workspace.id})`,
			);
		} catch (failure: unknown) {
			console.error("[ink] opening failed", failure);
			this.become(
				{
					kind: "unopened",
					failure: failure instanceof Error ? failure.message : String(failure),
				},
				"startup failed",
			);
		}
	};

	retry = async (): Promise<void> => {
		if (this.state.kind !== "unopened") {
			return;
		}

		this.become({ kind: "reading" }, "try again");
		await this.start();
	};

	private become(next: OpeningState<Started>, reason: string): void {
		if (!NEXT_KINDS[this.state.kind].includes(next.kind)) {
			throw new Error(`an opening cannot go from ${this.state.kind} to ${next.kind} (${reason})`);
		}

		console.info(`[ink] opening ${this.state.kind} → ${next.kind} (${reason})`);
		this.state = next;
		for (const changed of this.listeners) {
			changed();
		}
	}
}
