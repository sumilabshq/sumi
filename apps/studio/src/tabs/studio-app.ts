import type { CoreChanges, WindowModuleOffers } from "@sumi/sumi-host-plugin";
import { StoreClient, memoryStoreInvoke } from "@widgetarium/behaviors/tauri-store";
import { appHost } from "@widgetarium/app-host/contract";
import { browser } from "@widgetarium/browser/implementation";
import type { BrowserPagesIpc } from "@widgetarium/browser/implementation";
import { localTransport, mountOrStop, runtime } from "@widgetarium/data-framework";
import type { DeviceModule, Platform, RemoteTransport, Runtime } from "@widgetarium/data-framework";
import { layout } from "@widgetarium/layout/implementation";
import { plugins as pluginRegistry } from "@widgetarium/plugin-registry/implementation";
import type { CatalogueEntry } from "@widgetarium/plugin-registry/implementation";
import type { BoardFile } from "@widgetarium/tasks/implementation";
import { workspaces } from "@widgetarium/workspaces/implementation";
import { AppCallerAuthenticate } from "../features/app-frame/lib/app-caller.js";
import type { BackgroundModule, WindowModule } from "../plugins/sumi-plugins.js";
import type { FrameCoreModule } from "./frame-routes.js";

export function frameCoreModulesOf(backgroundModules: readonly BackgroundModule[]): readonly FrameCoreModule[] {
	return backgroundModules.map(({ contract, prefix }) => ({
		module: contract,
		prefix,
	}));
}

export interface TauriStudioLent {
	readonly store: StoreClient;
	readonly coreChanges: CoreChanges;
	readonly ipc: BrowserPagesIpc;
}

export interface StudioAppAsk {
	readonly platform: Platform;
	readonly workspaceId: string;
	readonly core?: RemoteTransport;
	readonly lent?: TauriStudioLent;
	readonly backgroundModules: readonly BackgroundModule[];
	readonly windowModules: readonly WindowModule[];
	readonly registry?: PluginRegistryAsk;
}

export interface PluginRegistryAsk {
	readonly catalogue: readonly CatalogueEntry[];
	readonly startedIds: readonly string[];
}

export function startStudioApp(ask: StudioAppAsk): Runtime {
	const served = ask.core ?? startCoreInProcess(ask.workspaceId, ask.backgroundModules);
	const studioApp = runtime()
		.modules(...studioModulesOf(ask.lent, ask.registry), ...windowModulesOf(ask))
		.imports(...ask.backgroundModules.map(({ contract, prefix }) => contract({ over: served, prefix })))
		.start({ platform: ask.platform, scope: { workspaceId: ask.workspaceId } });
	void restoreTabs(studioApp);
	return studioApp;
}

function windowModulesOf({ windowModules, lent }: StudioAppAsk): readonly DeviceModule[] {
	return windowModules.map((one) => one.moduleOf(windowModuleOffersOf(lent)));
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
		.modules(...backgroundModules.map(({ moduleOf }) => moduleOf(offers)))
		.start({ platform: "server", env: {}, scope: { workspaceId } });
	mountOrStop(core, (started) => local.serve(started, { authenticate: new AppCallerAuthenticate() }));
	return local;
}

export async function restoreTabs(studioApp: Runtime): Promise<void> {
	const answer = await studioApp.send(appHost.tabs.restore);

	if (!answer.ok) {
		console.error(`[widgetarium] the studio could not restore its tabs: ${answer.reason}`);
	}
}

function studioModulesOf(
	lent: TauriStudioLent | undefined,
	registry: PluginRegistryAsk | undefined,
): readonly DeviceModule[] {
	return [
		...baseStudioModulesOf(lent),
		...(registry === undefined
			? []
			: [pluginRegistry({ ...registry, ...(lent === undefined ? {} : { tauri: { store: lent.store } }) })]),
	];
}

function baseStudioModulesOf(lent: TauriStudioLent | undefined): readonly DeviceModule[] {
	if (lent === undefined) {
		return [layout, browser, workspaces];
	}

	const { store, ipc } = lent;
	return [layout({ tauri: { store } }), browser({ tauri: { ipc } }), workspaces({ tauri: { store, ipc } })];
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

function windowModuleOffersOf(lent: TauriStudioLent | undefined): WindowModuleOffers {
	return lent === undefined ? {} : { tauri: { store: lent.store, coreChanges: lent.coreChanges } };
}
