import { HeldDoc, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { ConfigFacts } from "@widgetarium/data-framework";
import type { TabViewsConfig } from "../../shared/host/tab-views.host.js";
import type { ViewsGateway } from "../views/views.gateway.js";
import { KEPT_VIEWS, KeptViewsGateway, KeptViewsSchema } from "../views/kept.gateway.js";
import { MemoryViewsGateway } from "../views/memory.gateway.js";

export type ViewsParts = {
	readonly views: ViewsGateway;
};

export function viewsPartsOn({ config, scope }: ConfigFacts<TabViewsConfig>): ViewsParts {
	if (config.store === undefined) {
		return { views: new MemoryViewsGateway() };
	}

	return {
		views: new KeptViewsGateway(
			HeldDoc.read({
				store: config.store,
				root: workspaceRootOf(scope.workspaceId),
				kind: KEPT_VIEWS,
				empty: KeptViewsSchema.parse({}),
			}),
		),
	};
}
