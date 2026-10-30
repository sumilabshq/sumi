import type { FocusedChat, FocusedChatPort } from "@widgetarium/core/engine/focused-chat-port.js";
import type { StartedApp } from "@widgetarium/core/requests";
import { PaneTreeQuery } from "@widgetarium/layout";
import type { PaneBoard } from "@widgetarium/layout";
import { ChatListQuery } from "@widgetarium/app-host";

export function focusedChatPortOf(studioApp: StartedApp): FocusedChatPort {
	return {
		now: () => focusedChatIn(studioApp),
		isOnScreen: (chatId) => boardIn(studioApp)?.chatGroups.some((group) => group.chatId === chatId) ?? false,
		watch: (changed) => {
			const stopBoard = studioApp.routes.watch(PaneTreeQuery, undefined, changed);
			const stopChats = studioApp.routes.watch(ChatListQuery, undefined, changed);
			return () => {
				stopBoard();
				stopChats();
			};
		},
	};
}

function focusedChatIn(studioApp: StartedApp): FocusedChat | null {
	const focusedId = boardIn(studioApp)?.focusedChatId ?? null;
	const read = studioApp.routes.readNow(ChatListQuery);

	if (focusedId === null || read === null) {
		return null;
	}

	const { pinned, recents } = ChatListQuery.outputSchema.parse(read.output);
	const row = [...pinned, ...recents].find((chat) => chat.id === focusedId);
	return row === undefined ? null : { id: row.id, title: row.title };
}

function boardIn(studioApp: StartedApp): PaneBoard | null {
	const read = studioApp.routes.readNow(PaneTreeQuery);
	return read === null ? null : PaneTreeQuery.outputSchema.parse(read.output);
}
