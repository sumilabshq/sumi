import { AppHostModule } from "@widgetarium/app-host/module";
import { AppInstallerModule } from "@widgetarium/app-installer/module";
import { RestoreTabsCommand } from "@widgetarium/app-host";
import { BrowserModule } from "@widgetarium/browser/module";
import { CommandMenuModule } from "@widgetarium/command-menu/module";
import { app, localTransport } from "@widgetarium/core/requests";
import type { Platform, RemoteTransport, StartedApp } from "@widgetarium/core/requests";
import { server } from "@widgetarium/core/requests/server";
import { LayoutModule } from "@widgetarium/layout/module";
import { PlacesModule } from "@widgetarium/places";
import { PlacesModule as RunnablePlacesModule } from "@widgetarium/places/module";
import { TasksModule } from "@widgetarium/tasks";
import { TasksModule as RunnableTasksModule } from "@widgetarium/tasks/module";
import { WorkspacesModule } from "@widgetarium/workspaces/module";

export interface StudioAppAsk {
	readonly platform: Platform;
	readonly workspaceId: string;
	readonly core?: RemoteTransport;
}

export function startStudioApp({ platform, workspaceId, core }: StudioAppAsk): StartedApp {
	const served = core ?? startCoreInProcess(workspaceId);
	const studioApp = app()
		.modules(LayoutModule, BrowserModule, WorkspacesModule, AppInstallerModule, AppHostModule, CommandMenuModule)
		.imports(PlacesModule.over(served), TasksModule.over(served))
		.start({ platform, scope: { workspaceId } });
	void restoreTabs(studioApp);
	return studioApp;
}

export function startCoreInProcess(workspaceId: string): RemoteTransport {
	const local = localTransport();
	server().modules(RunnablePlacesModule, RunnableTasksModule).listen(local).start({
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
