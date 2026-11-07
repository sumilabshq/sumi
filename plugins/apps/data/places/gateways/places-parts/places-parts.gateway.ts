import { HeldDoc, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind } from "@widgetarium/behaviors/tauri-store";
import type { TabsGateway } from "../tabs/tabs.gateway.js";
import { TauriTabsGateway } from "../tabs/tauri/tauri.gateway.js";
import type { WindowsGateway } from "../windows/windows.gateway.js";
import { KeptPlacesSchema, TauriWindowsGateway } from "../windows/tauri.gateway.js";
import type { KeptPlaces } from "../windows/tauri.gateway.js";
import { ListedPlacedAppsGateway } from "../placed-apps/listed.gateway.js";
import type { PlacedAppsGateway } from "../placed-apps/placed-apps.gateway.js";
import type { PlacesConfig } from "../../shared/host/places.host.js";

export type PlacesParts = {
	readonly windows: WindowsGateway;
	readonly tabs: TabsGateway;
	readonly placedApps: PlacedAppsGateway;
};

const PLACES: DocKind<KeptPlaces> = {
	file: "places.json",
	v: 1,
	schema: KeptPlacesSchema,
};

export function keptPlacesParts({ store, apps }: PlacesConfig, workspaceId: string): PlacesParts {
	const root = workspaceRootOf(workspaceId);
	const kept = HeldDoc.read({
		store,
		root,
		kind: PLACES,
		empty: KeptPlacesSchema.parse({}),
	});
	const placedApps = new ListedPlacedAppsGateway(apps);
	return {
		windows: new TauriWindowsGateway(kept),
		tabs: new TauriTabsGateway({ store, root, kept, apps: placedApps.placedApps() }),
		placedApps,
	};
}
