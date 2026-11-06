import { AppHostModule, CoreChangesHost } from "@widgetarium/app-host/module";
import { StoreClient, memoryStoreInvoke } from "@widgetarium/behaviors/tauri-store";
import { APP_MODULES } from "@widgetarium/app-registry/modules";
import { RestoreTabsCommand } from "@widgetarium/app-host";
import { BrowserModule, BrowserPagesIpcHost } from "@widgetarium/browser/module";
import { CommandMenuModule } from "@widgetarium/command-menu/module";
import { app, localTransport } from "@widgetarium/data-framework";
import type { HeldBy, Platform, RemoteTransport, StartedApp } from "@widgetarium/data-framework";
import { server } from "@widgetarium/data-framework/server";
import { LayoutModule, StudioWindowsHost } from "@widgetarium/layout/module";
import { PlacesModule } from "@widgetarium/places";
import { PlacesModule as RunnablePlacesModule } from "@widgetarium/places/module";
import { QuestionsModule } from "@widgetarium/questions";
import { QuestionsModule as RunnableQuestionsModule } from "@widgetarium/questions/module";
import { TasksModule } from "@widgetarium/tasks";
import type { BoardFile } from "@widgetarium/tasks/module";
import { FileSystemModule } from "@widgetarium/file-system/module";
import { WorkspacesModule } from "@widgetarium/workspaces/module";
import { AppCallerAuthenticate } from "../features/app-frame/lib/app-caller.js";

export type TauriStudioLent = HeldBy<{
	store: typeof StoreClient;
	studioWindows: typeof StudioWindowsHost;
	coreChanges: typeof CoreChangesHost;
	browserIpc: typeof BrowserPagesIpcHost;
}>;

export interface StudioAppAsk {
	readonly platform: Platform;
	readonly workspaceId: string;
	readonly core?: RemoteTransport;
	readonly lent?: TauriStudioLent;
}

export function startStudioApp({ platform, workspaceId, core, lent }: StudioAppAsk): StartedApp {
	const served = core ?? startCoreInProcess(workspaceId);
	const studioApp = app()
		.modules(LayoutModule, BrowserModule, WorkspacesModule, AppHostModule, CommandMenuModule)
		.imports(PlacesModule.over(served), TasksModule.over(served), QuestionsModule.over(served))
		.start({ platform, scope: { workspaceId }, ...(lent === undefined ? {} : { host: lent }) });
	void restoreTabs(studioApp);
	return studioApp;
}

export function startCoreInProcess(workspaceId: string): RemoteTransport {
	const local = localTransport();
	server()
		.modules(RunnablePlacesModule, FileSystemModule, RunnableQuestionsModule, ...APP_MODULES)
		.listen(local)
		.start({
			env: {},
			scope: { workspaceId },
			host: {
				file: boardFileInMemory(),
				store: new StoreClient(memoryStoreInvoke()),
				authenticate: new AppCallerAuthenticate(),
			},
		});
	return local;
}

export async function restoreTabs(studioApp: StartedApp): Promise<void> {
	const answer = await studioApp.send(RestoreTabsCommand);

	if (!answer.ok) {
		console.error(`[widgetarium] the studio could not restore its tabs: ${answer.reason}`);
	}
}

function boardFileInMemory(): BoardFile {
	const held: { text: string | null } = {
		text: null,
	};
	return {
		read: () => Promise.resolve(held.text),
		write: (text) => {
			held.text = text;
			return Promise.resolve();
		},
	};
}
