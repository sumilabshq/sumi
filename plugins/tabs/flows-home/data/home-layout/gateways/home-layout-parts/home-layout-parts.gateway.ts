import { GLOBAL_ROOT, HeldDoc } from "@widgetarium/behaviors/tauri-store";
import type { ConfigFacts } from "@widgetarium/data-framework";
import type { HomeLayoutConfig } from "../../shared/host/home-layout.host.js";
import type { ArrangementGateway } from "../arrangement/arrangement.gateway.js";
import { KEPT_ARRANGEMENT, KeptArrangementGateway, KeptArrangementSchema } from "../arrangement/kept.gateway.js";
import { MemoryArrangementGateway } from "../arrangement/memory.gateway.js";

export type HomeLayoutParts = {
	readonly arrangement: ArrangementGateway;
};

export function homeLayoutPartsOn({ config }: ConfigFacts<HomeLayoutConfig>): HomeLayoutParts {
	const { store } = config;

	if (store === undefined) {
		return { arrangement: new MemoryArrangementGateway() };
	}

	return {
		arrangement: new KeptArrangementGateway(
			store.heldOnce(GLOBAL_ROOT, KEPT_ARRANGEMENT.file, () =>
				HeldDoc.read({
					store,
					root: GLOBAL_ROOT,
					kind: KEPT_ARRANGEMENT,
					empty: KeptArrangementSchema.parse({}),
				}),
			),
		),
	};
}
