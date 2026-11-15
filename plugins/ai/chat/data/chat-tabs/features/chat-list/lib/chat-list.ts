import type { ChatTabs } from "@widgetarium/places/contract";
import type { ChatListData, ChatRowData } from "../../../shared/schema/chat-list.schema.js";

type ChatTabRow = ChatTabs["open"][number];

export function chatListOf(tabs: ChatTabs): ChatListData {
	return {
		recents: tabs.open.map(rowOf),
	};
}

function rowOf({ id, title, mark }: ChatTabRow): ChatRowData {
	return {
		id,
		title,
		mark,
	};
}
