import type { FlowsDoc } from "../../shared/schema/flows.schema.js";
import type { PlacedTabs } from "../../shared/schema/tabs.schema.js";
import type { MovePlaces, PlacedPlaces } from "../../shared/lib/flows/flow-moves.js";
import { reconciling } from "../../shared/lib/flows/flow-reconcile.js";
import type { ReconcileFacts } from "../../shared/lib/flows/flow-reconcile.js";
import { emptyPlacedTabs } from "../../shared/lib/tabs/kept-tabs.js";
import { TabsGateway } from "./tabs.gateway.js";

const MEMORY_WORKSPACE = "memory";

export class MemoryTabsGateway extends TabsGateway {
	private readonly listeners = new Set<() => void>();
	private readonly flowListeners = new Set<() => void>();
	private held: PlacedPlaces;

	constructor(
		held: PlacedTabs | null = null,
		private readonly otherWorkspaces = new Map<string, MemoryTabsGateway>(),
		private readonly ownWorkspaceId = MEMORY_WORKSPACE,
		flows: FlowsDoc | null = null,
		private readonly reconcile: ReconcileFacts | null = null,
	) {
		super();
		this.held = {
			tabs: held ?? emptyPlacedTabs(),
			flows,
		};
	}

	override workspaceId(): string {
		return this.ownWorkspaceId;
	}

	override places(): Promise<PlacedPlaces> {
		return Promise.resolve(this.held);
	}

	override movePlaces<T>(move: MovePlaces<T>): Promise<T> {
		const moved = reconciling(move, this.reconcile)(this.held);

		if (moved.next === null) {
			return Promise.resolve(moved.answer);
		}

		const isFlowsChanged = moved.next.flows !== this.held.flows;
		this.held = moved.next;
		for (const listener of [...this.listeners, ...(isFlowsChanged ? this.flowListeners : [])]) {
			listener();
		}

		return Promise.resolve(moved.answer);
	}

	override movePlacesIn<T>(workspaceId: string, move: MovePlaces<T>): Promise<T> {
		const kept =
			this.otherWorkspaces.get(workspaceId) ??
			new MemoryTabsGateway(null, this.otherWorkspaces, workspaceId, null, this.reconcile);
		this.otherWorkspaces.set(workspaceId, kept);
		return kept.movePlaces(move);
	}

	override placedTabsChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	override flowsChanged(listener: () => void): () => void {
		this.flowListeners.add(listener);
		return () => void this.flowListeners.delete(listener);
	}
}
