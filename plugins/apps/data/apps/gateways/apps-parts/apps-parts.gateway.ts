import type { AppsConfig } from "../../shared/host/apps.host.js";
import type { AppListGateway } from "../app-list/app-list.gateway.js";
import { ListedAppListGateway } from "../app-list/listed.gateway.js";
import { ListedPageTitlesGateway } from "../page-titles/listed.gateway.js";
import type { PageTitlesGateway } from "../page-titles/page-titles.gateway.js";
import { MemoryPagesGateway } from "../pages/memory.gateway.js";
import type { PagesGateway } from "../pages/pages.gateway.js";

export type AppsParts = {
	readonly appList: AppListGateway;
	readonly pages: PagesGateway;
	readonly pageTitles: PageTitlesGateway;
};


export function appsPartsOn({ config }: { readonly config: AppsConfig }): AppsParts {
	return {
		appList: new ListedAppListGateway(config.apps),
		pages: new MemoryPagesGateway(),
		pageTitles: new ListedPageTitlesGateway(config.titlesOf ?? new Map()),
	};
}
