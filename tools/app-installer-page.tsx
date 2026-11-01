import { Fragment, Suspense, createElement as h, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider, app, useQuery } from "../packages/shared/core/src/requests/index.ts";
import { AppInstallerModule } from "../packages/state/app-installer/module.ts";
import { MemoryAppsGateway } from "../packages/state/app-installer/gateways/apps/memory.gateway.ts";
import type { ReleaseRead } from "../packages/state/app-installer/gateways/apps/apps.gateway.ts";
import {
	InstallAppCommand,
	InstalledAppsQuery,
	UpdateAppsCommand,
} from "../packages/state/app-installer/generated/contract.ts";
import { AppHostModule } from "../packages/domain/app-host/module.ts";
import { AppFacesQuery, AppTabsQuery } from "../packages/domain/app-host/generated/contract.ts";
import { AppTabQuery, RecordAppPageCommand } from "../packages/state/places/generated/contract.ts";
import { appPageOf } from "../apps/studio/src/frame/app-page-of.tsx";
import { ChatPage } from "../apps/studio/src/frame/chat-page.tsx";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { LayoutModule } from "../packages/state/layout/module.ts";
import { WorkspacesModule } from "../packages/domain/workspaces/module.ts";
import { memoryWorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/memory.gateway.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { AppFramesProvider } from "../apps/studio/src/features/app-frame/ui/app-frames/app-frames-provider.tsx";
import { hearsAll } from "../apps/studio/src/features/app-frame/lib/frame-relay.ts";
import type { FrameRoutes } from "../apps/studio/src/features/app-frame/lib/frame-relay.ts";
import { InstalledAppPage } from "../apps/studio/src/features/app-frame/ui/installed-app-page/installed-app-page.tsx";
import { FakeBrowserPagesGateway, fakeBrowser } from "./browser-fakes.ts";
import { reportsFailures } from "./page-harness.ts";
import { placedTabsOf, placesLinkOf } from "./places-fixture.ts";
import { PlacesModule as PlacesContract } from "../packages/state/places/generated/contract.ts";

declare global {
	interface Window {
		__RELEASES__?: Readonly<Record<string, ReleaseRead>>;
		__appInstaller?: AppInstallerDriver;
	}
}

interface AppInstallerDriver {
	readonly install: () => Promise<unknown>;
	readonly place: (version: string) => void;
	readonly updateApps: () => Promise<unknown>;
	readonly recordAddress: (tabId: string, address: string) => Promise<unknown>;
	readonly showTab: (tabId: string) => void;
	readonly read: () => Promise<unknown>;
	readonly installReplacing: () => Promise<unknown>;
	readonly readReplacing: () => Promise<unknown>;
}

reportsFailures();

const HELLO_FOLDER = "/releases/hello";
const READY_TIMEOUT_MS = 3000;
const TAB_IDS = ["t1", "t2"];
const REPLACING_APPS = ["canvas", "terminal", "chat"];
const PAGE_APPS = ["canvas", "terminal"];
const CHAT_TAB = "c1";
const releases = window.__RELEASES__ ?? {};

function replacingFolderOf(id: string): string {
	return `/releases/${id}`;
}
const apps = new MemoryAppsGateway({
	registry: {
		apps: [
			{
				id: "hello",
				source: {
					kind: "folder",
					path: HELLO_FOLDER,
				},
			},
			...REPLACING_APPS.map((id) => ({
				id,
				source: {
					kind: "folder" as const,
					path: replacingFolderOf(id),
				},
			})),
			{
				id: "elsewhere",
				source: {
					kind: "github",
					repository: "someone/elsewhere",
				},
			},
		],
	},
	folders: {},
	fileUrlOf: ({ id, version }, file) => `/apps/${id}/${version}/${file}`,
});
const tabs = new MemoryTabsGateway(
	placedTabsOf(
		{
			tabs: [helloTab("t1", "/busy"), helloTab("t2", ""), ...PAGE_APPS.map((app) => seededTab(`k-${app}`, app, ""))],
			shownId: "t1",
			minted: 2,
			closed: [],
		},
		[CHAT_TAB],
	),
);
const core = placesLinkOf(tabs);
const studio = app()
	.modules(
		AppInstallerModule.with({
			apps,
		}),
		AppHostModule,
		BrowserModule.with(fakeBrowser(new FakeBrowserPagesGateway()).parts),
		LayoutModule,
		WorkspacesModule.with(
			memoryWorkspacesParts({
				workspaces: [
					{
						id: "default",
						name: "Widgetarium",
						icon: null,
					},
				],
				currentId: "default",
				chats: {
					chats: [],
					openOnStartId: null,
				},
			}),
		),
	)
	.imports(PlacesContract.over(core))
	.start({ platform: "browser", scope: { workspaceId: "default" } });

interface SeededTab {
	readonly id: string;
	readonly app: string;
	readonly pageId: null;
	readonly label: null;
	readonly lastAddress: string;
}

function helloTab(id: string, address: string): SeededTab {
	return seededTab(id, "hello", address);
}

function seededTab(id: string, app: string, address: string): SeededTab {
	return {
		id,
		app,
		pageId: null,
		label: null,
		lastAddress: address,
	};
}

let shownTabId = "t1";
const shownListeners = new Set<() => void>();

function placeRelease(version: string): void {
	const read = releases[version];

	if (read === undefined) {
		throw new Error(`the page was given no release ${version}`);
	}

	apps.placeFolder(HELLO_FOLDER, read);
}

async function outputOf(answer: Promise<{ ok: boolean; output?: unknown; reason?: string }>): Promise<unknown> {
	const settled = await answer;
	return settled.ok ? settled.output : { refused: settled.reason };
}

window.__appInstaller = {
	install: () => outputOf(studio.send(InstallAppCommand, { id: "hello" })),
	place: placeRelease,
	updateApps: () => outputOf(studio.send(UpdateAppsCommand)),
	recordAddress: async (tabId, address) => {
		const recorded = await outputOf(studio.send(RecordAppPageCommand, { id: tabId, address }));
		// TRADE-OFF: stands in for the core-changed event that rereads app-host's tabs in Tauri
		await studio.queryClient.invalidateQueries();
		return recorded;
	},
	showTab: (tabId) => {
		shownTabId = tabId;
		shownListeners.forEach((told) => told());
	},
	read: async () => {
		const [installed, appTabs] = await Promise.all([studio.send(InstalledAppsQuery), studio.send(AppTabsQuery)]);
		return {
			installed: installed.ok ? installed.output : installed.reason,
			tabs: appTabs.ok
				? appTabs.output.tabs.map(({ id, title, address }) => ({
						id,
						title,
						address,
					}))
				: appTabs.reason,
			frames: TAB_IDS.map((id) => ({
				id,
				src: document.querySelector(`[data-tab="${id}"] iframe`)?.getAttribute("data-app-frame-src") ?? null,
				missing: document.querySelector(`[data-tab="${id}"] [data-app-missing]`)?.textContent ?? null,
			})),
		};
	},
	installReplacing: () =>
		Promise.all(
			REPLACING_APPS.map((id) => {
				placeReplacing(id);
				return outputOf(studio.send(InstallAppCommand, { id }));
			}),
		),
	readReplacing: async () => {
		const [chatTab, installed] = await Promise.all([
			studio.send(AppTabQuery, { id: CHAT_TAB }),
			studio.send(InstalledAppsQuery),
		]);
		const chatApp = installed.ok ? installed.output.apps.find(({ id }) => id === "chat") : undefined;
		return {
			pages: REPLACING_APPS.map((id) => ({
				id,
				isBuiltIn: document.querySelector(`[data-page="${id}"] [data-built-in]`) !== null,
				src: document.querySelector(`[data-page="${id}"] iframe`)?.getAttribute("src") ?? null,
			})),
			chatId: chatTab.ok ? chatTab.output.chatId : chatTab.reason,
			chatVersions:
				chatApp === undefined
					? null
					: {
							current: chatApp.current,
							failed: chatApp.failed,
						},
		};
	},
};

function placeReplacing(id: string): void {
	const read = releases["1.0.0"];

	if (read === undefined) {
		throw new Error("the page was given no release 1.0.0");
	}

	apps.placeFolder(replacingFolderOf(id), {
		...read,
		manifest: {
			...(read.manifest as Record<string, unknown>),
			id,
		},
		release: {
			...read.release,
			app: id,
		},
	});
}

function BuiltInStandIn({ app }: { readonly app: string }): ReactElement {
	return <p data-built-in={app}>{app}</p>;
}

function ReplacingPages(): ReactElement {
	const { faces } = useQuery(AppFacesQuery).data;
	return (
		<>
			{PAGE_APPS.map((app) => (
				<div key={app} data-page={app} style={{ height: "100px" }}>
					{appPageOf({
						app,
						faces,
						builtIn: {
							canvas: () => <BuiltInStandIn app="canvas" />,
							terminal: () => <BuiltInStandIn app="terminal" />,
						},
						installed: () => <InstalledAppPage app={app} tabId={`k-${app}`} isShown={false} />,
					})}
				</div>
			))}
			<div data-page="chat" style={{ height: "100px" }}>
				<ChatPage chatId={CHAT_TAB} renderBuiltIn={() => <BuiltInStandIn app="chat" />} />
			</div>
		</>
	);
}

function onShown(told: () => void): () => void {
	shownListeners.add(told);
	return () => shownListeners.delete(told);
}

function helloRoutes(): Promise<FrameRoutes> {
	return Promise.resolve({
		routes: [
			{
				module: PlacesContract,
				transport: core,
				hears: hearsAll,
			},
		],
		release: () => undefined,
	});
}

function Frames(): ReactElement {
	const shown = useSyncExternalStore(onShown, () => shownTabId);
	return (
		<AppFramesProvider routesFor={helloRoutes} readyTimeoutMs={READY_TIMEOUT_MS}>
			{TAB_IDS.map((id) => (
				<div key={id} data-tab={id} style={{ height: "200px" }}>
					<InstalledAppPage app="hello" tabId={id} isShown={id === shown} />
				</div>
			))}
			<Suspense fallback={null}>
				<ReplacingPages />
			</Suspense>
		</AppFramesProvider>
	);
}

const root = document.getElementById("root");

if (root !== null) {
	createRoot(root).render(
		<AppProvider app={studio}>
			<Frames />
		</AppProvider>,
	);
}
