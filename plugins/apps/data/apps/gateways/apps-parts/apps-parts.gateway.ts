import { HeldDoc, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { ConfigFacts } from "@widgetarium/data-framework";
import type { AppsConfig } from "../../shared/host/apps.host.js";
import type { AppListGateway } from "../app-list/app-list.gateway.js";
import { ListedAppListGateway } from "../app-list/listed.gateway.js";
import { ListedPageTitlesGateway } from "../page-titles/listed.gateway.js";
import type { PageTitlesGateway } from "../page-titles/page-titles.gateway.js";
import { KEPT_PAGES, KeptPagesGateway, KeptPagesSchema } from "../pages/kept.gateway.js";
import { MemoryPagesGateway } from "../pages/memory.gateway.js";
import type { PagesGateway } from "../pages/pages.gateway.js";

export type AppsParts = {
	readonly appList: AppListGateway;
	readonly pages: PagesGateway;
	readonly pageTitles: PageTitlesGateway;
};

export function appsPartsOn({ config, scope }: ConfigFacts<AppsConfig>): AppsParts {
	return {
		appList: new ListedAppListGateway(config.apps),
		pages: pagesOf(config, scope.workspaceId),
		pageTitles: new ListedPageTitlesGateway(config.titlesOf ?? new Map()),
	};
}

function pagesOf({ store }: AppsConfig, workspaceId: string): PagesGateway {
	if (store === undefined) {
		return new MemoryPagesGateway();
	}

	return new KeptPagesGateway(
		HeldDoc.reading({
			store,
			root: workspaceRootOf(workspaceId),
			kind: KEPT_PAGES,
			empty: KeptPagesSchema.parse({}),
		}),
	);
}
