import type { ChatTabs } from "@widgetarium/places";
import type { ChatListData, ChatRowData } from "../../../shared/schema/chat-list.schema.js";

type ChatTabRow = ChatTabs["pinned"][number];

export function chatListOf(tabs: ChatTabs): ChatListData {
	return {
		pinned: tabs.pinned.map((row) => rowOf(row, true)),
		recents: tabs.open.map((row) => rowOf(row, false)),
	};
}

function rowOf({ id, title, mark }: ChatTabRow, isPinned: boolean): ChatRowData {
	return {
		id,
		title,
		isPinned,
		mark,
	};
}
