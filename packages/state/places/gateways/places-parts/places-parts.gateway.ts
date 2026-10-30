import { invoke } from "@tauri-apps/api/core";
import type { ModuleFacts, Platform } from "@widgetarium/core/requests";
import { HeldDoc, StoreClient, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind } from "@widgetarium/behaviors/tauri-store";
import type { TabsGateway } from "../tabs/tabs.gateway.js";
import { MemoryTabsGateway } from "../tabs/memory.gateway.js";
import { TauriTabsGateway } from "../tabs/tauri/tauri.gateway.js";
import type { WindowsGateway } from "../windows/windows.gateway.js";
import { MemoryWindowsGateway } from "../windows/memory.gateway.js";
import { KeptPlacesSchema, TauriWindowsGateway } from "../windows/tauri.gateway.js";
import type { KeptPlaces } from "../windows/tauri.gateway.js";

export type PlacesParts = {
	readonly windows: WindowsGateway;
	readonly tabs: TabsGateway;
};

const PLACES_STORE = "PLACES_STORE";

const TAURI_PLACES_STORE = "tauri";

const PLACES: DocKind<KeptPlaces> = {
	file: "places.json",
	v: 1,
	schema: KeptPlacesSchema,
};

const PARTS_ON: Readonly<Record<Platform, (facts: ModuleFacts) => PlacesParts>> = {
	browser: memoryPlacesParts,
	tauri: memoryPlacesParts,
	server: serverPlacesParts,
};

export function placesPartsOn(facts: ModuleFacts): PlacesParts {
	return PARTS_ON[facts.platform](facts);
}

export function memoryPlacesParts(): PlacesParts {
	return {
		windows: new MemoryWindowsGateway({
			windows: [],
		}),
		tabs: new MemoryTabsGateway(),
	};
}

function serverPlacesParts(facts: ModuleFacts): PlacesParts {
	return facts.env[PLACES_STORE] === TAURI_PLACES_STORE ? coreWindowPlacesParts(facts) : memoryPlacesParts();
}

// TRADE-OFF: places' only stored server is the Tauri core window, so its file is the Tauri store; a Node server needs its own gateway
function coreWindowPlacesParts({ scope }: ModuleFacts): PlacesParts {
	const store = new StoreClient((command, args) => invoke(command, args));
	const root = workspaceRootOf(scope.workspaceId);
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
