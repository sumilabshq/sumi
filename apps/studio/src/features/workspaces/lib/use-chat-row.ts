import { useQuery } from "@widgetarium/data-framework";
import { ChatListQuery } from "@widgetarium/app-host";
import type { ChatRowData } from "@widgetarium/app-host";

export function useChatRow(chatId: string | null): ChatRowData | null {
	const { pinned, recents } = useQuery(ChatListQuery).data;
	const rows = [...pinned, ...recents];
	return rows.find((row) => row.id === chatId) ?? null;
}
