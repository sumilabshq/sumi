import type { FocusedChat, FocusedChatPort } from "@widgetarium/core/engine/focused-chat-port.js";
import type { Runtime } from "@widgetarium/data-framework";
import { layout } from "@widgetarium/layout";
import type { PaneBoard } from "@widgetarium/layout";
import { chatTabs } from "@sumi/chat-tabs";

export function focusedChatPortOf(studioApp: Runtime): FocusedChatPort {
	return {
		now: () => focusedChatIn(studioApp),
		isOnScreen: (chatId) => boardIn(studioApp)?.chatGroups.some((group) => group.chatId === chatId) ?? false,
		watch: (changed) => {
			const stopBoard = studioApp.routes.watch(layout.panes.paneTree, undefined, changed);
			const stopChats = studioApp.routes.watch(chatTabs.chatList.chatList, undefined, changed);
			return () => {
				stopBoard();
				stopChats();
			};
		},
	};
}

function focusedChatIn(studioApp: Runtime): FocusedChat | null {
	const focusedId = boardIn(studioApp)?.focusedChatId ?? null;
	const read = studioApp.routes.readNow(chatTabs.chatList.chatList);

	if (focusedId === null || read === null) {
		return null;
	}

	const { pinned, recents } = chatTabs.chatList.chatList.outputSchema.parse(read.output);
	const row = [...pinned, ...recents].find((chat) => chat.id === focusedId);
	return row === undefined ? null : { id: row.id, title: row.title };
}

function boardIn(studioApp: Runtime): PaneBoard | null {
	const read = studioApp.routes.readNow(layout.panes.paneTree);
	return read === null ? null : layout.panes.paneTree.outputSchema.parse(read.output);
}
