import type { AppsConfig } from "../../shared/host/apps.host.js";
import type { AppListGateway } from "../app-list/app-list.gateway.js";
import { ListedAppListGateway } from "../app-list/listed.gateway.js";
import { MemoryPagesGateway } from "../pages/memory.gateway.js";
import type { PagesGateway } from "../pages/pages.gateway.js";

export type AppsParts = {
	readonly appList: AppListGateway;
	readonly pages: PagesGateway;
};

export function appsPartsOn({ config }: { readonly config: AppsConfig }): AppsParts {
	return {
		appList: new ListedAppListGateway(config.apps),
		pages: new MemoryPagesGateway(),
	};
}
