import { invoke } from "@tauri-apps/api/core";
import type { ModuleFacts, Platform } from "@widgetarium/core/requests";
import { HeldDoc, StoreClient, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind } from "@widgetarium/behaviors/tauri-store";
import type { WindowsGateway } from "../windows/windows.gateway.js";
import { MemoryWindowsGateway } from "../windows/memory.gateway.js";
import { KeptPlacesSchema, TauriWindowsGateway } from "../windows/tauri.gateway.js";
import type { KeptPlaces } from "../windows/tauri.gateway.js";

export type PlacesParts = {
	readonly windows: WindowsGateway;
};

const PLACES: DocKind<KeptPlaces> = {
	file: "places.json",
	v: 1,
	schema: KeptPlacesSchema,
};

const PARTS_ON: Readonly<Record<Platform, (facts: ModuleFacts) => PlacesParts>> = {
	browser: memoryPlacesParts,
	tauri: memoryPlacesParts,
	server: coreWindowPlacesParts,
};

export function placesPartsOn(facts: ModuleFacts): PlacesParts {
	return PARTS_ON[facts.platform](facts);
}

export function memoryPlacesParts(): PlacesParts {
	return {
		windows: new MemoryWindowsGateway({
			windows: [],
		}),
	};
}

// TRADE-OFF: places' only server is the Tauri core window, so its file is the Tauri store; a Node server needs its own gateway
function coreWindowPlacesParts({ scope }: ModuleFacts): PlacesParts {
	const store = new StoreClient((command, args) => invoke(command, args));
	return {
		windows: new TauriWindowsGateway(
			HeldDoc.read({
				store,
				root: workspaceRootOf(scope.workspaceId),
				kind: PLACES,
				empty: KeptPlacesSchema.parse({}),
			}),
		),
	};
}
