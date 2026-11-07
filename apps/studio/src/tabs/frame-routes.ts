import {
	AppearanceModule,
	FileSystemModule,
	PlacesModule,
	QuestionsModule,
	TerminalModule,
	WebPageModule,
} from "@sumi/contract";
import { stableKey } from "@widgetarium/data-framework/gateway/stable-key";
import type { LocalTransport, RemoteTransport, StartedApp } from "@widgetarium/data-framework";
import type { StartedServer } from "@widgetarium/data-framework/server";
import { server } from "@widgetarium/data-framework/server";
import { AppTabQuery } from "@widgetarium/places";
import { TasksModule } from "@widgetarium/tasks";
import { WebPageModule as ServerWebPageModule } from "@widgetarium/web-page/module";
import type { AppTabs, NativeWebPages, WebPageConfig } from "@widgetarium/web-page/module";
import { AppCallerAuthenticate } from "../features/app-frame/lib/app-caller.js";
import { hearsAll } from "../features/app-frame/lib/frame-relay.js";
import type { FrameOpened, FrameRoute, FrameRoutes, FrameRoutesFor } from "../features/app-frame/lib/frame-relay.js";
import { ServerLeases } from "../features/app-frame/lib/server-leases.js";
import type { HeldTransport } from "../features/app-frame/lib/server-leases.js";

export interface FrameRoutesAsk {
	readonly workspaceId: string;
	readonly core: RemoteTransport;
	readonly studioApp: StartedApp;
	readonly nativeWebPages: NativeWebPages | null;
	readonly appearance: RemoteTransport;
}

interface FrameLease {
	readonly ask: FrameRoutesAsk;
	readonly webPages: ServerLeases;
	readonly opened: FrameOpened;
}

const TASKS_APP = "tasks";
const WEB_PAGE_SERVER = "studio";
const NOT_CLOSED = "[widgetarium] tab {tab}: its web page was left open on frame unmount ({reason})";

export function frameRoutesOf(ask: FrameRoutesAsk): FrameRoutesFor {
	const webPages = new ServerLeases("web-page", (_key, local) => startWebPageServer(local, ask));
	return (opened) =>
		Promise.resolve(
			leaseRoutes({
				ask,
				webPages,
				opened,
			}),
		);
}

export function webPageRouteOf({ transport }: HeldTransport, tabId: string): FrameRoute {
	const ownInput = stableKey({
		tab: tabId,
	});
	return {
		module: WebPageModule,
		transport,
		hears: ({ inputKey }) => inputKey === null || inputKey === "" || inputKey === ownInput,
	};
}

function leaseRoutes({ ask, webPages, opened }: FrameLease): FrameRoutes {
	const { tabId } = opened;
	const webPage = webPages.lease(WEB_PAGE_SERVER);
	return {
		routes: [
			...coreRoutesOf(ask.core),
			...tasksRoutesOf(ask.core, opened.app),
			webPageRouteOf(webPage, tabId),
			{
				module: AppearanceModule,
				transport: ask.appearance,
				hears: hearsAll,
			},
		],
		release: () => {
			webPage.release();
			closeLeftPage(ask.nativeWebPages, tabId);
		},
	};
}

function coreRoutesOf(core: RemoteTransport): readonly FrameRoute[] {
	return [FileSystemModule, TerminalModule, PlacesModule, QuestionsModule].map((module) => ({
		module,
		transport: core,
		hears: hearsAll,
	}));
}

function tasksRoutesOf(core: RemoteTransport, app: string): readonly FrameRoute[] {
	if (app !== TASKS_APP) {
		return [];
	}

	return [
		{
			module: TasksModule,
			transport: core,
			hears: hearsAll,
		},
	];
}

function closeLeftPage(nativePages: NativeWebPages | null, tabId: string): void {
	if (nativePages === null) {
		return;
	}

	nativePages.closePage(tabId).catch((failure: unknown) => {
		console.warn(NOT_CLOSED.replace("{tab}", tabId).replace("{reason}", String(failure)));
	});
}

function startWebPageServer(
	local: LocalTransport,
	{ workspaceId, studioApp, nativeWebPages }: FrameRoutesAsk,
): StartedServer {
	return server()
		.modules(ServerWebPageModule(webPageConfigOf(appTabsOver(studioApp), nativeWebPages)))
		.listen(local)
		.start({
			env: {},
			scope: {
				workspaceId,
			},
			host: {
				authenticate: new AppCallerAuthenticate(),
			},
		});
}

function webPageConfigOf(appTabs: AppTabs, nativePages: NativeWebPages | null): WebPageConfig {
	if (nativePages === null) {
		return {
			kind: "web",
			webAppTabs: appTabs,
		};
	}

	return {
		kind: "tauri",
		tauriAppTabs: appTabs,
		nativePages,
	};
}

function appTabsOver(studioApp: StartedApp): AppTabs {
	return {
		appOfTab: async (tab) => {
			const answer = await studioApp.send(AppTabQuery, { id: tab });
			return answer.ok ? answer.output.app : null;
		},
	};
}
