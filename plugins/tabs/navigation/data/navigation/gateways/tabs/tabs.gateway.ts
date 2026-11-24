import type { PlacedTabs } from "../../shared/schema/tabs.schema.js";
import type { MovePlacedTabs } from "../../shared/lib/settling/settling.js";
import { tabsMoveAsPlaces } from "../../shared/lib/flows/flow-moves.js";
import type { MovePlaces, PlacedPlaces } from "../../shared/lib/flows/flow-moves.js";

export abstract class TabsGateway {
	abstract workspaceId(): string;
	abstract places(): Promise<PlacedPlaces>;
	abstract movePlaces<T>(move: MovePlaces<T>): Promise<T>;
	abstract movePlacesIn<T>(workspaceId: string, move: MovePlaces<T>): Promise<T>;
	abstract placedTabsChanged(listener: () => void): () => void;

	async placedTabs(): Promise<PlacedTabs> {
		return (await this.places()).tabs;
	}

	movePlacedTabs<T>(move: MovePlacedTabs<T>): Promise<T> {
		return this.movePlaces(tabsMoveAsPlaces(move));
	}

	movePlacedTabsIn<T>(workspaceId: string, move: MovePlacedTabs<T>): Promise<T> {
		return this.movePlacesIn(workspaceId, tabsMoveAsPlaces(move));
	}
}
