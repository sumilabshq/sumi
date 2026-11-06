import {
	AppearanceModule,
	AssistantModule,
	FileSystemModule,
	PlacesModule,
	QuestionsModule,
	TerminalModule,
	WebPageModule,
} from "@sumi/contract";
import { stableKey } from "@widgetarium/framework/gateway/stable-key";
import type { LocalTransport, RemoteTransport, StartedApp } from "@widgetarium/framework";
import type { StartedServer } from "@widgetarium/framework/server";
import { server } from "@widgetarium/framework/server";
import { AppTabQuery } from "@widgetarium/places";
import { TasksModule } from "@widgetarium/tasks";
import { WebPageModule as ServerWebPageModule } from "@widgetarium/web-page/module";
import type { AppTabs, NativeWebPages } from "../features/app-frame/lib/web-page-hosts.js";
import type { AssistantHostObjects } from "../assistant/chat-app.js";
import { frameChatServersOf } from "../assistant/frame-chat-servers.js";
import { AppCallerAuthenticate } from "../features/app-frame/lib/app-caller.js";
import { hearsAll } from "../features/app-frame/lib/frame-relay.js";
import type { FrameOpened, FrameRoute, FrameRoutes, FrameRoutesFor } from "../features/app-frame/lib/frame-relay.js";
import { ServerLeases } from "../features/app-frame/lib/server-leases.js";
import type { HeldTransport } from "../features/app-frame/lib/server-leases.js";

export interface FrameRoutesAsk {
	readonly workspaceId: string;
	readonly core: RemoteTransport;
	readonly studioApp: StartedApp;
	readonly assistantHost: AssistantHostObjects;
	readonly nativeWebPages: NativeWebPages | null;
	readonly appearance: RemoteTransport;
}

interface FrameLease {
	readonly ask: FrameRoutesAsk;
	readonly leases: {
		readonly chats: ServerLeases;
		readonly webPages: ServerLeases;
	};
	readonly opened: FrameOpened;
	readonly chatId: string | null;
}

const CHAT_APP = "chat";
const TASKS_APP = "tasks";
const WEB_PAGE_SERVER = "studio";
const NO_CHAT = "[widgetarium] app {app} tab {tab}: no chat route ({reason})";
const NOT_CLOSED = "[widgetarium] tab {tab}: its web page was left open on frame unmount ({reason})";

export function frameRoutesOf(ask: FrameRoutesAsk): FrameRoutesFor {
	const leases = {
		chats: frameChatServersOf({
			workspaceId: ask.workspaceId,
			host: ask.assistantHost,
		}),
		webPages: new ServerLeases("web-page", (_key, local) => startWebPageServer(local, ask)),
	};
	return async (opened) => {
		const chatId = await chatIdOf(ask.studioApp, opened);
		return leaseRoutes({
			ask,
			leases,
			opened,
			chatId,
		});
	};
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

function leaseRoutes({ ask, leases, opened, chatId }: FrameLease): FrameRoutes {
	const { tabId } = opened;
	const webPage = leases.webPages.lease(WEB_PAGE_SERVER);
	const chat = chatId === null ? null : leases.chats.lease(chatId);
	return {
		routes: [
			...coreRoutesOf(ask.core),
			...tasksRoutesOf(ask.core, opened.app),
			webPageRouteOf(webPage, tabId),
			...chatRoutesOf(chat),
			{
				module: AppearanceModule,
				transport: ask.appearance,
				hears: hearsAll,
			},
		],
		release: () => {
			webPage.release();
			chat?.release();
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

function chatRoutesOf(chat: HeldTransport | null): readonly FrameRoute[] {
	if (chat === null) {
		return [];
	}

	return [
		{
			module: AssistantModule,
			transport: chat.transport,
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
		.modules(ServerWebPageModule)
		.listen(local)
		.start({
			env: {},
			scope: {
				workspaceId,
			},
			host: {
				...webPageHostOf(appTabsOver(studioApp), nativeWebPages),
				authenticate: new AppCallerAuthenticate(),
			},
		});
}

function webPageHostOf(
	appTabs: AppTabs,
	nativePages: NativeWebPages | null,
): { readonly webAppTabs: AppTabs } | { readonly tauriAppTabs: AppTabs; readonly nativePages: NativeWebPages } {
	if (nativePages === null) {
		return {
			webAppTabs: appTabs,
		};
	}

	return {
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

async function chatIdOf(studioApp: StartedApp, opened: FrameOpened): Promise<string | null> {
	if (opened.app !== CHAT_APP) {
		return logNoChat(opened, "the frame's app is not the chat app");
	}

	const answer = await studioApp.send(AppTabQuery, { id: opened.tabId });

	if (!answer.ok) {
		return logNoChat(opened, answer.reason);
	}

	return answer.output.chatId ?? logNoChat(opened, "the tab is not a chat tab");
}

function logNoChat({ app, tabId }: FrameOpened, reason: string): null {
	console.info(NO_CHAT.replace("{app}", app).replace("{tab}", tabId).replace("{reason}", reason));
	return null;
}
