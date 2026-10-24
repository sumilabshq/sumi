import { ONE_CHAT } from "@widgetarium/core/engine/active-chat-port.js";
import type { ActiveChat, ActiveChatPort } from "@widgetarium/core/engine/active-chat-port.js";
import type { StartedApp } from "@widgetarium/core/requests";
import { ActiveChatQuery } from "@widgetarium/workspaces";

export function activeChatPortOf(workspacesApp: StartedApp): ActiveChatPort {
	return {
		now: () => activeChatIn(workspacesApp),
		watch: (changed) => workspacesApp.routes.watch(ActiveChatQuery, undefined, changed),
	};
}

function activeChatIn(workspacesApp: StartedApp): ActiveChat {
	const read = workspacesApp.routes.readNow(ActiveChatQuery);
	return read === null ? ONE_CHAT.now() : ActiveChatQuery.outputSchema.parse(read.output);
}
