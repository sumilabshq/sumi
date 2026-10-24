import { handler, refuse } from "@widgetarium/core/requests";
import { ChatsStore, titleOf } from "../../shared/lib/chats-store.js";
import { WorkspacesStore } from "../../shared/lib/workspaces-store.js";
import type { ChatListData, ChatRowData, KeptChat } from "../../shared/schema/chat.schema.js";
import { WorkspacesClientModule } from "../../module.js";
import {
	ChatCrumbQuery,
	ChatListQuery,
	CreateChatCommand,
	PinChatCommand,
	RenameChatCommand,
	SelectChatCommand,
} from "./contract.js";

export const ChatListQueryHandler = handler(ChatListQuery, WorkspacesClientModule)
	.inject({ chatsStore: ChatsStore })
	.watch((_input, { chatsStore }, changed) => chatsStore.watch(changed))
	.handle((_input, { chatsStore }) => chatListOf(chatsStore));

export const ChatCrumbQueryHandler = handler(ChatCrumbQuery, WorkspacesClientModule)
	.inject({ chatsStore: ChatsStore, workspacesStore: WorkspacesStore })
	.watch((_input, { chatsStore, workspacesStore }, changed) => {
		const unwatchChats = chatsStore.watch(changed);
		const unwatchWorkspaces = workspacesStore.watch(changed);
		return () => {
			unwatchChats();
			unwatchWorkspaces();
		};
	})
	.handle((_input, { chatsStore, workspacesStore }) => ({
		workspace: workspacesStore.current().name,
		chat: chatsStore.activeChat().title,
	}));

export const CreateChatCommandHandler = handler(CreateChatCommand, WorkspacesClientModule)
	.inject({ chatsStore: ChatsStore })
	.handle((_input, { chatsStore }) => void chatsStore.create());

export const SelectChatCommandHandler = handler(SelectChatCommand, WorkspacesClientModule)
	.inject({ chatsStore: ChatsStore })
	.handle(({ id }, { chatsStore }) => chatsStore.select(id));

export const PinChatCommandHandler = handler(PinChatCommand, WorkspacesClientModule)
	.inject({ chatsStore: ChatsStore })
	.handle(({ id, isPinned }, { chatsStore }) => chatsStore.pin(id, isPinned));

export const RenameChatCommandHandler = handler(RenameChatCommand, WorkspacesClientModule)
	.inject({ chatsStore: ChatsStore })
	.handle(({ id, title }, { chatsStore }) => {
		const refusal = chatsStore.rename(id, title);
		if (refusal !== null) {
			return refuse(refusal);
		}
	});

function chatListOf(chatsStore: ChatsStore): ChatListData {
	const { chats, activeId } = chatsStore.now();
	const rowOf = (chat: KeptChat): ChatRowData => ({
		id: chat.id,
		title: titleOf(chat),
		isPinned: chat.isPinned,
		isActive: chat.id === activeId,
		mark: chatsStore.markOf(chat.id),
	});
	const latestFirst = [...chats].sort((one, other) => other.lastAt - one.lastAt);
	return {
		pinned: latestFirst.filter((chat) => chat.isPinned).map(rowOf),
		recents: latestFirst.filter((chat) => !chat.isPinned).map(rowOf),
	};
}
