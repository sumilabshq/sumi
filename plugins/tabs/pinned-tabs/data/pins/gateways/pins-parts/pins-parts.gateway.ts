import { HeldDoc, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { ConfigFacts } from "@widgetarium/data-framework";
import type { PinsConfig } from "../../shared/host/pins.host.js";
import type { PinsGateway } from "../pins/pins.gateway.js";
import { KEPT_PINS, KeptPinsGateway, KeptPinsSchema } from "../pins/kept.gateway.js";
import { MemoryPinsGateway } from "../pins/memory.gateway.js";

export type PinsParts = {
	readonly pins: PinsGateway;
};

export function pinsPartsOn({ config, scope }: ConfigFacts<PinsConfig>): PinsParts {
	if (config.store === undefined) {
		return { pins: new MemoryPinsGateway() };
	}

	return {
		pins: new KeptPinsGateway(
			HeldDoc.read({
				store: config.store,
				root: workspaceRootOf(scope.workspaceId),
				kind: KEPT_PINS,
				empty: KeptPinsSchema.parse({}),
			}),
		),
	};
}
