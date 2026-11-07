import type { ModuleFacts, Platform } from "@widgetarium/data-framework";
import type { SwitchesGateway } from "../switches/switches.gateway.js";
import { MemorySwitchesGateway } from "../switches/memory.gateway.js";

export type FilePageParts = {
	readonly switches: SwitchesGateway;
};

const PARTS_ON: Readonly<Record<Platform, (facts: ModuleFacts) => FilePageParts>> = {
	browser: memoryFilePageParts,
	tauri: memoryFilePageParts,
	server: memoryFilePageParts,
};

export function filePagePartsOn(facts: ModuleFacts): FilePageParts {
	return PARTS_ON[facts.platform](facts);
}

export function memoryFilePageParts(): FilePageParts {
	return {
		switches: new MemorySwitchesGateway({
			on: [],
			loads: 0,
		}),
	};
}
