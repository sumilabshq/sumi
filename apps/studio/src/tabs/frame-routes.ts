import { AssistantModule, FileSystemModule, PlacesModule, TerminalModule, WebPageModule } from "@sumi/contract";
import { localTransport } from "@widgetarium/core/requests";
import type { RemoteTransport, StartedApp } from "@widgetarium/core/requests";
import { server } from "@widgetarium/core/requests/server";
import { AppTabQuery } from "@widgetarium/places";
import { WebPageModule as RunnableWebPageModule } from "@widgetarium/web-page/module";
import type { AppTabs, NativeWebPages } from "../features/app-frame/lib/web-page-hosts.js";
import type { AssistantHostObjects } from "../assistant/chat-app.js";
import { FrameChatServers } from "../assistant/frame-chat-servers.js";
import { AppCallerAuthenticate } from "../features/app-frame/lib/app-caller.js";
import type { FrameRoute, FrameRoutes, FrameRoutesFor } from "../features/app-frame/lib/frame-relay.js";

export interface FrameRoutesAsk {
	readonly workspaceId: string;
	readonly core: RemoteTransport;
	readonly studioApp: StartedApp;
	readonly assistantHost: AssistantHostObjects;
	readonly nativeWebPages: NativeWebPages | null;
}

const LEADING_SLASH = /^\//;
const NO_CHAT = "[widgetarium] tab {tab}: no chat route ({reason})";

export function frameRoutesOf(ask: FrameRoutesAsk): FrameRoutesFor {
	const shellRoutes = shellRoutesOf(ask);
	const chats = new FrameChatServers({
		workspaceId: ask.workspaceId,
		host: ask.assistantHost,
	});
	return async ({ tabId }) => {
		const chatId = await chatOfTab(ask.studioApp, tabId);
		return chatId === null ? routesOnly(shellRoutes) : withChat(shellRoutes, chats, chatId);
	};
}

function shellRoutesOf(ask: FrameRoutesAsk): readonly FrameRoute[] {
	const coreRoutes = [FileSystemModule, TerminalModule, PlacesModule].map((module) => ({
		module,
		transport: ask.core,
	}));
	return [
		...coreRoutes,
		{
			module: WebPageModule,
			transport: webPageServed(ask),
		},
	];
}

function routesOnly(routes: readonly FrameRoute[]): FrameRoutes {
	return {
		routes,
		release: () => undefined,
	};
}

function withChat(routes: readonly FrameRoute[], chats: FrameChatServers, chatId: string): FrameRoutes {
	const chat = chats.transportFor(chatId);
	return {
		routes: [
			...routes,
			{
				module: AssistantModule,
				transport: chat.transport,
			},
		],
		release: chat.release,
	};
}

function webPageServed({ workspaceId, studioApp, nativeWebPages }: FrameRoutesAsk): RemoteTransport {
	const local = localTransport();
	server()
		.modules(RunnableWebPageModule)
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
	return local;
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

async function chatOfTab(studioApp: StartedApp, tabId: string): Promise<string | null> {
	const answer = await studioApp.send(AppTabQuery, { id: tabId });
	const chatId = answer.ok ? (answer.output.address ?? "").replace(LEADING_SLASH, "") : "";

	if (chatId === "") {
		console.info(
			NO_CHAT.replace("{tab}", tabId).replace("{reason}", answer.ok ? "its address names no chat" : answer.reason),
		);
		return null;
	}

	return chatId;
}
