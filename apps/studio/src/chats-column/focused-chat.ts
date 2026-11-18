import type { FocusedChat, FocusedChatPort } from "@widgetarium/core/engine/focused-chat-port.js";
import type { Runtime } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import type { PaneBoard } from "@widgetarium/app-host/contract";
import { chatTabs } from "@sumi/chat-tabs/contract";

interface HeldBoard {
	board: PaneBoard | null;
}

export function focusedChatPortOf(studioApp: Runtime): FocusedChatPort {
	const held: HeldBoard = { board: null };
	const reread = async (): Promise<void> => {
		const answered = await studioApp.send(appHost.panes.paneTree);
		held.board = answered.ok ? answered.output : held.board;
	};
	void reread();
	return {
		now: () => focusedChatIn(studioApp, held.board),
		isOnScreen: (chatId) => held.board?.chatGroups.some((group) => group.chatId === chatId) ?? false,
		watch: (changed) => {
			const stopBoard = studioApp.routes.watch(appHost.panes.paneTree, undefined, () => {
				void reread().then(changed);
			});
			const stopChats = studioApp.routes.watch(chatTabs.chatList.all, undefined, changed);
			return () => {
				stopBoard();
				stopChats();
			};
		},
	};
}

function focusedChatIn(studioApp: Runtime, board: PaneBoard | null): FocusedChat | null {
	const focusedId = board?.focusedChatId ?? null;
	const read = studioApp.routes.readNow(chatTabs.chatList.all);

	if (focusedId === null || read === null) {
		return null;
	}

	const { recents } = chatTabs.chatList.all.outputSchema.parse(read.output);
	const row = recents.find((chat) => chat.id === focusedId);
	return row === undefined ? null : { id: row.id, title: row.title };
}
