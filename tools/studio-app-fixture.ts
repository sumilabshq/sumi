import { app } from "../packages/shared/data-framework/src/index.ts";
import type { StartedApp } from "../packages/shared/data-framework/src/index.ts";
import { AppHostModule } from "../packages/domain/app-host/module.ts";
import type { AppHostParts } from "../packages/domain/app-host/gateways/app-host-parts/app-host-parts.gateway.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { CommandMenuModule } from "../packages/domain/command-menu/module.ts";
import type { BrowserParts } from "../packages/domain/browser/gateways/browser-parts/browser-parts.gateway.ts";
import { LayoutModule } from "../packages/state/layout/module.ts";
import { WorkspacesModule } from "../packages/domain/workspaces/module.ts";
import type { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { placesOver } from "./places-fixture.ts";
import type { WorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/workspaces-parts.gateway.ts";

export interface StudioAppParts {
	readonly browser?: BrowserParts;
	readonly appHost?: AppHostParts;
	readonly workspaces?: WorkspacesParts;
	readonly workspaceId?: string;
	readonly places?: MemoryTabsGateway;
}

export function studioAppOf({
	browser,
	appHost,
	workspaces,
	workspaceId = "studio",
	places,
}: StudioAppParts): StartedApp {
	return app()
		.modules(
			browser === undefined ? BrowserModule : BrowserModule.with(browser),
			LayoutModule,
			workspaces === undefined ? WorkspacesModule : WorkspacesModule.with(workspaces),
			appHost === undefined ? AppHostModule : AppHostModule.with({ ...appHost }),
			CommandMenuModule,
		)
		.imports(placesOver(places))
		.start({ platform: "browser", scope: { workspaceId } });
}
