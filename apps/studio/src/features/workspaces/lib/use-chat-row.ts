import { useQuery } from "@widgetarium/data-framework";
import { chatTabs } from "@sumi/chat-tabs";
import type { ChatRowData } from "@sumi/chat-tabs";

export function useChatRow(chatId: string | null): ChatRowData | null {
	const { pinned, recents } = useQuery(chatTabs.chatList.chatList).data;
	const rows = [...pinned, ...recents];
	return rows.find((row) => row.id === chatId) ?? null;
}
