import { AssistantModule } from "@widgetarium/assistant/module";
import type { LocalTransport } from "@widgetarium/core/requests";
import { server } from "@widgetarium/core/requests/server";
import type { StartedServer } from "@widgetarium/core/requests/server";
import { AppCallerAuthenticate } from "../features/app-frame/lib/app-caller.js";
import { ServerLeases } from "../features/app-frame/lib/server-leases.js";
import type { AssistantHostObjects } from "./chat-app.js";
import { hostForChat } from "./chat-apps.js";

interface FrameChatServersAsk {
	readonly workspaceId: string;
	readonly host: AssistantHostObjects;
}

export function frameChatServersOf(ask: FrameChatServersAsk): ServerLeases {
	return new ServerLeases("chat", (chatId, local) =>
		startChatServer(local, {
			workspaceId: ask.workspaceId,
			host: hostForChat(ask.host, chatId),
		}),
	);
}

function startChatServer(local: LocalTransport, { workspaceId, host }: FrameChatServersAsk): StartedServer {
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
