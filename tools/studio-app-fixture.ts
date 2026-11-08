import { PluginAppsModule } from "./plugin-apps-fixture.ts";
import { runtime } from "../packages/shared/data-framework/src/index.ts";
import type { Runtime } from "../packages/shared/data-framework/src/index.ts";
import { appHost as appHostModule } from "../plugins/apps/data/app-host/module.ts";
import type { AppHostParts } from "../plugins/apps/data/app-host/gateways/app-host-parts/app-host-parts.gateway.ts";
import { browser as browserModule } from "../packages/domain/browser/module.ts";
import { PLUGIN_WINDOW_MODULES } from "./command-menu-fixture.ts";
import type { BrowserParts } from "../packages/domain/browser/gateways/browser-parts/browser-parts.gateway.ts";
import { layout } from "../packages/state/layout/module.ts";
import { workspaces as workspacesModule } from "../packages/domain/workspaces/module.ts";
import type { MemoryTabsGateway } from "../plugins/apps/data/places/gateways/tabs/memory.gateway.ts";
import { placesOver } from "./places-fixture.ts";
import type { WorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/workspaces-parts.gateway.ts";

export interface StudioAppParts {
	readonly browser?: BrowserParts;
	readonly appHost?: AppHostParts;
	readonly workspaces?: WorkspacesParts;
	readonly workspaceId?: string;
	readonly places?: MemoryTabsGateway;
}

export function studioAppOf({ browser, appHost, workspaces, workspaceId = "studio", places }: StudioAppParts): Runtime {
	return runtime()
		.modules(
			PluginAppsModule,
			browser === undefined ? browserModule : browserModule({ injects: browser }),
			layout,
			workspaces === undefined ? workspacesModule : workspacesModule({ injects: workspaces }),
			appHost === undefined ? appHostModule : appHostModule({ injects: { ...appHost } }),
			...PLUGIN_WINDOW_MODULES,
		)
		.imports(placesOver(places))
		.start({ platform: "browser", scope: { workspaceId } });
}
