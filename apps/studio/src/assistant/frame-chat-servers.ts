import { AssistantModule } from "@widgetarium/assistant/module";
import { localTransport } from "@widgetarium/core/requests";
import type { LocalTransport, RemoteTransport } from "@widgetarium/core/requests";
import { server } from "@widgetarium/core/requests/server";
import type { StartedServer } from "@widgetarium/core/requests/server";
import { AppCallerAuthenticate } from "../features/app-frame/lib/app-caller.js";
import type { AssistantHostObjects } from "./chat-app.js";
import { hostForChat } from "./chat-apps.js";

export interface FrameChatServersAsk {
	readonly workspaceId: string;
	readonly host: AssistantHostObjects;
}

export interface HeldChatTransport {
	readonly transport: RemoteTransport;
	release(): void;
}

interface ServedChat {
	readonly transport: RemoteTransport;
	readonly served: StartedServer;
	readonly frames: number;
}

export class FrameChatServers {
	private readonly chats = new Map<string, ServedChat>();

	constructor(private readonly ask: FrameChatServersAsk) {}

	transportFor(chatId: string): HeldChatTransport {
		const held = this.chats.get(chatId) ?? this.startedFor(chatId);
		this.counted(chatId, held, held.frames + 1);
		return {
			transport: held.transport,
			release: () => this.released(chatId),
		};
	}

	private released(chatId: string): void {
		const held = this.chats.get(chatId);

		if (held === undefined) {
			return;
		}

		if (held.frames > 1) {
			this.counted(chatId, held, held.frames - 1);
			return;
		}

		held.served.stop();
		this.chats.delete(chatId);
		console.info(`[widgetarium] chat ${chatId} frames 1 → 0, server served → stopped`);
	}

	private counted(chatId: string, held: ServedChat, frames: number): void {
		this.chats.set(chatId, {
			...held,
			frames,
		});
		console.info(`[widgetarium] chat ${chatId} frames ${held.frames} → ${frames}`);
	}

	private startedFor(chatId: string): ServedChat {
		const local = localTransport();
		console.info(`[widgetarium] chat ${chatId} server none → served (a frame asked for it)`);
		return {
			transport: local,
			served: chatServerOn(local, {
				workspaceId: this.ask.workspaceId,
				host: hostForChat(this.ask.host, chatId),
			}),
			frames: 0,
		};
	}
}

function chatServerOn(local: LocalTransport, { workspaceId, host }: FrameChatServersAsk): StartedServer {
	return server()
		.modules(AssistantModule)
		.listen(local)
		.start({
			env: {},
			scope: {
				workspaceId,
			},
			host: {
				...host,
				authenticate: new AppCallerAuthenticate(),
			},
		});
}
