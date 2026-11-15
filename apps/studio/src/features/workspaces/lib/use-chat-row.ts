import { useQuery } from "@widgetarium/data-framework";
import { chatTabs } from "@sumi/chat-tabs/contract";
import type { ChatRowData } from "@sumi/chat-tabs/contract";

export function useChatRow(chatId: string | null): ChatRowData | null {
	const { recents } = useQuery(chatTabs.chatList.all).data;
	return recents.find((row) => row.id === chatId) ?? null;
}
