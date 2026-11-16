import { GLOBAL_ROOT, HeldDoc } from "@widgetarium/behaviors/tauri-store";
import type { ConfigFacts } from "@widgetarium/data-framework";
import type { HomePagesConfig } from "../../shared/host/home-pages.host.js";
import type { HomePageFace } from "../../shared/schema/home-pages.schema.js";
import type { ChoiceGateway } from "../choice/choice.gateway.js";
import { KEPT_CHOICE, KeptChoiceGateway, KeptChoiceSchema } from "../choice/kept.gateway.js";
import { MemoryChoiceGateway } from "../choice/memory.gateway.js";

export type HomePagesParts = {
	readonly choice: ChoiceGateway;
	readonly pages: readonly HomePageFace[];
};

export function homePagesPartsOn({ config }: ConfigFacts<HomePagesConfig>): HomePagesParts {
	const { store, pages } = config;

	if (store === undefined) {
		return { choice: new MemoryChoiceGateway(), pages };
	}

	return {
		choice: new KeptChoiceGateway(
			store.heldOnce(GLOBAL_ROOT, KEPT_CHOICE.file, () =>
				HeldDoc.read({ store, root: GLOBAL_ROOT, kind: KEPT_CHOICE, empty: KeptChoiceSchema.parse({}) }),
			),
		),
		pages,
	};
}
