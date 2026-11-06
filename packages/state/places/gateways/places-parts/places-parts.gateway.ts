import { HeldDoc, StoreClient, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind } from "@widgetarium/behaviors/tauri-store";
import type { TabsGateway } from "../tabs/tabs.gateway.js";
import { TauriTabsGateway } from "../tabs/tauri/tauri.gateway.js";
import type { WindowsGateway } from "../windows/windows.gateway.js";
import { KeptPlacesSchema, TauriWindowsGateway } from "../windows/tauri.gateway.js";
import type { KeptPlaces } from "../windows/tauri.gateway.js";

export type PlacesParts = {
	readonly windows: WindowsGateway;
	readonly tabs: TabsGateway;
};

export const PLACES_HOST_NEEDS = {
	store: StoreClient,
};

const PLACES: DocKind<KeptPlaces> = {
	file: "places.json",
	v: 1,
	schema: KeptPlacesSchema,
};

export function keptPlacesParts(store: StoreClient, workspaceId: string): PlacesParts {
	const root = workspaceRootOf(workspaceId);
	const kept = HeldDoc.read({
		store,
		root,
		kind: PLACES,
		empty: KeptPlacesSchema.parse({}),
	});
	return {
		windows: new TauriWindowsGateway(kept),
		tabs: new TauriTabsGateway({ store, root, kept }),
	};
}
