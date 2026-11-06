import { AssistantModule } from "@widgetarium/assistant/module";
import type { LocalTransport } from "@widgetarium/data-framework";
import { server } from "@widgetarium/data-framework/server";
import type { StartedServer } from "@widgetarium/data-framework/server";
import { AppCallerAuthenticate } from "../features/app-frame/lib/app-caller.js";
import { ServerLeases } from "../features/app-frame/lib/server-leases.js";
import type { AssistantHosts } from "@widgetarium/assistant/module";
import { hostForChat } from "./chat-apps.js";

interface FrameChatServersAsk {
	readonly workspaceId: string;
	readonly host: AssistantHosts;
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
		.modules(AssistantModule(host))
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
