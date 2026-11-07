import { AppHostModule } from "@widgetarium/app-host/module";
import type { CoreChanges } from "@widgetarium/app-host/module";
import { StoreClient, memoryStoreInvoke } from "@widgetarium/behaviors/tauri-store";
import { RestoreTabsCommand } from "@widgetarium/app-host";
import { BrowserModule } from "@widgetarium/browser/module";
import type { BrowserPagesIpc } from "@widgetarium/browser/module";
import { localTransport, mountOrStop, runtime } from "@widgetarium/data-framework";
import type {
	DeviceModule,
	ModuleContract,
	Platform,
	RemoteTransport,
	Runtime,
	ServerRuns,
} from "@widgetarium/data-framework";
import { FileSystemModule as FileSystemContract, TerminalModule as TerminalContract } from "@sumi/contract";
import { LayoutModule } from "@widgetarium/layout/module";
import type { StudioWindows } from "@widgetarium/layout/module";
import type { BoardFile } from "@widgetarium/tasks/module";
import { FileSystemModule } from "@widgetarium/file-system/module";
import { TerminalModule } from "@widgetarium/terminal/module";
import { WorkspacesModule } from "@widgetarium/workspaces/module";
import { AppCallerAuthenticate } from "../features/app-frame/lib/app-caller.js";
import type { BackgroundModule } from "../plugins/sumi-plugins.js";

const HOST_CAPABILITY_CONTRACTS: readonly ModuleContract<ServerRuns>[] = [FileSystemContract, TerminalContract];

export function frameCoreModulesOf(
	backgroundModules: readonly BackgroundModule[],
): readonly ModuleContract<ServerRuns>[] {
	return [...HOST_CAPABILITY_CONTRACTS, ...backgroundModules.map(({ contract }) => contract)];
}

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
	readonly windowModules: readonly DeviceModule[];
}

export function startStudioApp({
	platform,
	workspaceId,
	core,
	lent,
	backgroundModules,
	windowModules,
}: StudioAppAsk): Runtime {
	const served = core ?? startCoreInProcess(workspaceId, backgroundModules);
	const studioApp = runtime()
		.modules(...studioModulesOf(lent), ...windowModules)
		.imports(...backgroundModules.map(({ contract }) => contract({ over: served })))
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
	const core = runtime()
		.modules(FileSystemModule, TerminalModule, ...backgroundModules.map(({ moduleOf }) => moduleOf(offers)))
		.start({ platform: "server", env: {}, scope: { workspaceId } });
	mountOrStop(core, (started) => local.serve(started, { authenticate: new AppCallerAuthenticate() }));
	return local;
}

export async function restoreTabs(studioApp: Runtime): Promise<void> {
	const answer = await studioApp.send(RestoreTabsCommand);

	if (!answer.ok) {
		console.error(`[widgetarium] the studio could not restore its tabs: ${answer.reason}`);
	}
}

function studioModulesOf(lent: TauriStudioLent | undefined): readonly DeviceModule[] {
	if (lent === undefined) {
		return [LayoutModule, BrowserModule, WorkspacesModule, AppHostModule];
	}

	const { store, windows, coreChanges, ipc } = lent;
	return [
		LayoutModule({ tauri: { store, windows } }),
		BrowserModule({ tauri: { ipc } }),
		WorkspacesModule({ tauri: { store } }),
		AppHostModule({ tauri: { store, coreChanges } }),
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
