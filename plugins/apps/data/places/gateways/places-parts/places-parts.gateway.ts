import { GLOBAL_ROOT, HeldDoc, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, StoreClient } from "@widgetarium/behaviors/tauri-store";
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

const SEEDED = "places global none → workspace {workspace} places (tabs belong to windows, not workspaces)";

const partsOfStore = new WeakMap<StoreClient, PlacesParts>();

export function keptPlacesParts(config: PlacesConfig, workspaceId: string): PlacesParts {
	const known = partsOfStore.get(config.store);

	if (known !== undefined) {
		return known;
	}

	const parts = globalPlacesParts(config, workspaceId);
	partsOfStore.set(config.store, parts);
	return parts;
}

function globalPlacesParts({ store, apps }: PlacesConfig, workspaceId: string): PlacesParts {
	const kept = seededPlaces(store, workspaceId);
	const placedApps = new ListedPlacedAppsGateway(apps);
	return {
		windows: new TauriWindowsGateway(kept),
		tabs: new TauriTabsGateway({ store, root: workspaceRootOf(workspaceId), kept, apps: placedApps.placedApps() }),
		placedApps,
	};
}

async function seededPlaces(store: StoreClient, workspaceId: string): Promise<HeldDoc<KeptPlaces>> {
	const kept = await HeldDoc.read({ store, root: GLOBAL_ROOT, kind: PLACES, empty: KeptPlacesSchema.parse({}) });

	if (kept.now().tabs !== undefined) {
		return kept;
	}

	const workspace = await store.readDoc(workspaceRootOf(workspaceId), PLACES);

	if (workspace.doc === null) {
		return kept;
	}

	const reason = SEEDED.replace("{workspace}", workspaceId);
	kept.change(workspace.doc, reason);
	await kept.flush();
	console.info(`[widgetarium] ${reason}`);
	return kept;
}
