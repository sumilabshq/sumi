import type { AppsConfig } from "../../shared/host/apps.host.js";
import type { AppListGateway } from "../app-list/app-list.gateway.js";
import { ListedAppListGateway } from "../app-list/listed.gateway.js";

export type AppsParts = {
	readonly appList: AppListGateway;
};

export function appsPartsOn({ config }: { readonly config: AppsConfig }): AppsParts {
	return {
		appList: new ListedAppListGateway(config.apps),
	};
}
