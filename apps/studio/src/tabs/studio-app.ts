import { AppHostModule } from "@widgetarium/app-host/module";
import { RestoreTabsCommand } from "@widgetarium/app-host";
import { BrowserModule } from "@widgetarium/browser/module";
import { CommandMenuModule } from "@widgetarium/command-menu/module";
import { app, localTransport } from "@widgetarium/core/requests";
import type { Platform, RemoteTransport, StartedApp } from "@widgetarium/core/requests";
import { server } from "@widgetarium/core/requests/server";
import { LayoutModule } from "@widgetarium/layout/module";
import { PlacesModule } from "@widgetarium/places";
import { PlacesModule as RunnablePlacesModule } from "@widgetarium/places/module";
import { WorkspacesModule } from "@widgetarium/workspaces/module";

export interface StudioAppAsk {
	readonly platform: Platform;
	readonly workspaceId: string;
	readonly places?: RemoteTransport;
}

export function startStudioApp({ platform, workspaceId, places }: StudioAppAsk): StartedApp {
	const studioApp = app()
		.modules(LayoutModule, BrowserModule, WorkspacesModule, AppHostModule, CommandMenuModule)
		.imports(PlacesModule.over(places ?? placesInProcess(workspaceId)))
		.start({ platform, scope: { workspaceId } });
	void restoreTabs(studioApp);
	return studioApp;
}

export function placesInProcess(workspaceId: string): RemoteTransport {
	const local = localTransport();
	server().modules(RunnablePlacesModule).listen(local).start({
		env: {},
		scope: { workspaceId },
	});
	return local;
}

export async function restoreTabs(studioApp: StartedApp): Promise<void> {
	const answer = await studioApp.send(RestoreTabsCommand);

	if (!answer.ok) {
		console.error(`[widgetarium] the studio could not restore its tabs: ${answer.reason}`);
	}
}
