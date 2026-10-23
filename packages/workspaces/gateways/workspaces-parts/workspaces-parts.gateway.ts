import type { ActiveChatPort } from "@widgetarium/core/engine/active-chat-port.js";
import type { AssistantSession } from "@widgetarium/core/engine/assistant-port.js";
import { ChatsStore } from "../../shared/lib/chats-store.js";
import { WorkspacesStore } from "../../shared/lib/workspaces-store.js";
import type { ChatsGateway } from "../chats/chats.gateway.js";
import type { WorkspacesGateway } from "../workspaces/workspaces.gateway.js";

export interface WorkspacesParts {
	readonly workspacesGateway: WorkspacesGateway;
	readonly workspacesStore: WorkspacesStore;
	readonly chatsStore: ChatsStore;
	readonly activeChat: ActiveChatPort;
}

export interface WorkspacesPartsAsk {
	readonly workspacesGateway: WorkspacesGateway;
	readonly chatsGateway: ChatsGateway;
}

export interface ChatSessionLink {
	readonly activeChat: ActiveChatPort;
	readonly onSessionChanged: (chatId: string, session: AssistantSession) => void;
}

export function workspacesPartsOf({ workspacesGateway, chatsGateway }: WorkspacesPartsAsk): WorkspacesParts {
	const chatsStore = new ChatsStore(chatsGateway.kept());
	chatsGateway.keep(chatsStore.now());
	chatsStore.watchKept(() => chatsGateway.keep(chatsStore.now()));
	return {
		workspacesGateway,
		workspacesStore: new WorkspacesStore(workspacesGateway.kept()),
		chatsStore,
		activeChat: activeChatPortOf(chatsStore),
	};
}

export function chatSessionLinkOf({ chatsStore, activeChat }: WorkspacesParts): ChatSessionLink {
	return {
		activeChat,
		onSessionChanged: (chatId, session) =>
			chatsStore.recordTurnState(chatId, {
				isBusy: session.busy,
				firstAsked: session.turns.find((turn) => turn.role === "user")?.text ?? null,
			}),
	};
}

function activeChatPortOf(chatsStore: ChatsStore): ActiveChatPort {
	return {
		now: chatsStore.activeChat,
		watch: chatsStore.watch,
	};
}
