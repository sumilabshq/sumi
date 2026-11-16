import type { OpenChats } from "@sumi/chat-facts/contract";
import type { ChatListData, ChatRowData } from "../../../shared/schema/chat-list.schema.js";

type ChatTabRow = OpenChats["open"][number];

export function chatListOf(tabs: OpenChats): ChatListData {
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
