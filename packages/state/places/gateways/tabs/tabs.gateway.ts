import type { PlacedTabs } from "../../shared/schema/tabs.schema.js";
import type { MovePlacedTabs } from "../../shared/lib/settling/settling.js";

export abstract class TabsGateway {
	abstract placedTabs(): Promise<PlacedTabs>;
	abstract movePlacedTabs<T>(move: MovePlacedTabs<T>): Promise<T>;
	abstract placedTabsChanged(listener: () => void): () => void;
}
