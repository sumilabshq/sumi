import { HeldDoc, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { ConfigFacts } from "@widgetarium/data-framework";
import type { ArtboardsConfig } from "../../shared/host/artboards.host.js";
import type { CanvasesGateway } from "../canvases/canvases.gateway.js";
import { KEPT_CANVASES, KeptCanvasesGateway, KeptCanvasesSchema } from "../canvases/kept.gateway.js";
import { MemoryCanvasesGateway } from "../canvases/memory.gateway.js";

export type ArtboardsParts = {
	readonly canvases: CanvasesGateway;
};

export function artboardsPartsOn({ config, scope }: ConfigFacts<ArtboardsConfig>): ArtboardsParts {
	if (config.store === undefined) {
		return { canvases: new MemoryCanvasesGateway() };
	}

	return {
		canvases: new KeptCanvasesGateway(
			HeldDoc.reading({
				store: config.store,
				root: workspaceRootOf(scope.workspaceId),
				kind: KEPT_CANVASES,
				empty: KeptCanvasesSchema.parse({}),
			}),
		),
	};
}
