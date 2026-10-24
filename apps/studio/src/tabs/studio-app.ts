import { AppHostModule } from "@widgetarium/app-host/module";
import { RestoreTabsCommand } from "@widgetarium/app-host";
import { BrowserModule } from "@widgetarium/browser/module";
import { CommandMenuModule } from "@widgetarium/command-menu/module";
import { app } from "@widgetarium/core/requests";
import type { Platform, StartedApp } from "@widgetarium/core/requests";
import { LayoutModule } from "@widgetarium/layout/module";
import { WorkspacesModule } from "@widgetarium/workspaces/module";

export interface StudioAppAsk {
	readonly platform: Platform;
	readonly workspaceId: string;
}

export function startStudioApp({ platform, workspaceId }: StudioAppAsk): StartedApp {
	const studioApp = app()
		.modules(LayoutModule, BrowserModule, WorkspacesModule, AppHostModule, CommandMenuModule)
		.start({ platform, scope: { workspaceId } });
	void restoreTabs(studioApp);
	return studioApp;
}

export async function restoreTabs(studioApp: StartedApp): Promise<void> {
	const answer = await studioApp.send(RestoreTabsCommand);

	if (!answer.ok) {
		console.error(`[widgetarium] the studio could not restore its tabs: ${answer.reason}`);
	}
}
