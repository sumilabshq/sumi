import { AppHostModule } from "@widgetarium/app-host/module";
import type { CoreChanges } from "@widgetarium/app-host/module";
import { StoreClient, memoryStoreInvoke } from "@widgetarium/behaviors/tauri-store";
import { RestoreTabsCommand } from "@widgetarium/app-host";
import { BrowserModule } from "@widgetarium/browser/module";
import type { BrowserPagesIpc } from "@widgetarium/browser/module";
import { CommandMenuModule } from "@widgetarium/command-menu/module";
import { app, localTransport } from "@widgetarium/data-framework";
import type { DeviceModule, Platform, RemoteTransport, StartedApp } from "@widgetarium/data-framework";
import { server } from "@widgetarium/data-framework/server";
import { LayoutModule } from "@widgetarium/layout/module";
import type { StudioWindows } from "@widgetarium/layout/module";
import type { BoardFile } from "@widgetarium/tasks/module";
import { FileSystemModule } from "@widgetarium/file-system/module";
import { TerminalModule } from "@widgetarium/terminal/module";
import { WorkspacesModule } from "@widgetarium/workspaces/module";
import { AppCallerAuthenticate } from "../features/app-frame/lib/app-caller.js";
import type { BackgroundModule } from "../plugins/sumi-plugins.js";

export interface TauriStudioLent {
	readonly store: StoreClient;
	readonly windows: StudioWindows;
	readonly coreChanges: CoreChanges;
	readonly ipc: BrowserPagesIpc;
}

export interface StudioAppAsk {
	readonly platform: Platform;
	readonly workspaceId: string;
	readonly core?: RemoteTransport;
	readonly lent?: TauriStudioLent;
	readonly backgroundModules: readonly BackgroundModule[];
}

export function startStudioApp({ platform, workspaceId, core, lent, backgroundModules }: StudioAppAsk): StartedApp {
	const served = core ?? startCoreInProcess(workspaceId, backgroundModules);
	const studioApp = app()
		.modules(...studioModulesOf(lent))
		.imports(...backgroundModules.map(({ contract }) => contract.over(served)))
		.start({ platform, scope: { workspaceId } });
	void restoreTabs(studioApp);
	return studioApp;
}

export function startCoreInProcess(
	workspaceId: string,
	backgroundModules: readonly BackgroundModule[],
): RemoteTransport {
	const local = localTransport();
	const offers = {
		store: new StoreClient(memoryStoreInvoke()),
		file: boardFileInMemory(),
	};
	server()
		.modules(FileSystemModule, TerminalModule, ...backgroundModules.map(({ moduleOf }) => moduleOf(offers)))
		.listen(local)
		.start({
			env: {},
			scope: { workspaceId },
			host: {
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

function studioModulesOf(lent: TauriStudioLent | undefined): readonly DeviceModule[] {
	if (lent === undefined) {
		return [LayoutModule, BrowserModule, WorkspacesModule, AppHostModule, CommandMenuModule];
	}

	const { store, windows, coreChanges, ipc } = lent;
	return [
		LayoutModule({ tauri: { store, windows } }),
		BrowserModule({ tauri: { ipc } }),
		WorkspacesModule({ tauri: { store } }),
		AppHostModule({ tauri: { store, coreChanges } }),
		CommandMenuModule,
	];
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
