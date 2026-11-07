import { useQuery } from "@widgetarium/data-framework";
import { ChatListQuery } from "@sumi/chat-tabs";
import type { ChatRowData } from "@sumi/chat-tabs";

export function useChatRow(chatId: string | null): ChatRowData | null {
	const { pinned, recents } = useQuery(ChatListQuery).data;
	const rows = [...pinned, ...recents];
	return rows.find((row) => row.id === chatId) ?? null;
}
