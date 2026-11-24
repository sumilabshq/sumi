import type { FlowsDoc } from "../../shared/schema/flows.schema.js";
import type { PlacedTabs } from "../../shared/schema/tabs.schema.js";
import type { MovePlaces, PlacedPlaces } from "../../shared/lib/flows/flow-moves.js";
import { emptyPlacedTabs } from "../../shared/lib/tabs/kept-tabs.js";
import { TabsGateway } from "./tabs.gateway.js";

const MEMORY_WORKSPACE = "memory";

export class MemoryTabsGateway extends TabsGateway {
	private readonly listeners = new Set<() => void>();
	private held: PlacedPlaces;

	constructor(
		held: PlacedTabs | null = null,
		private readonly otherWorkspaces = new Map<string, MemoryTabsGateway>(),
		private readonly ownWorkspaceId = MEMORY_WORKSPACE,
		flows: FlowsDoc | null = null,
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
		const moved = move(this.held);

		if (moved.next === null) {
			return Promise.resolve(moved.answer);
		}

		this.held = moved.next;
		for (const listener of [...this.listeners]) {
			listener();
		}

		return Promise.resolve(moved.answer);
	}

	override movePlacesIn<T>(workspaceId: string, move: MovePlaces<T>): Promise<T> {
		const kept =
			this.otherWorkspaces.get(workspaceId) ?? new MemoryTabsGateway(null, this.otherWorkspaces, workspaceId);
		this.otherWorkspaces.set(workspaceId, kept);
		return kept.movePlaces(move);
	}

	override placedTabsChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
