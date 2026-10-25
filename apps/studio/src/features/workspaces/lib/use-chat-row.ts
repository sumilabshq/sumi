import { useQuery } from "@widgetarium/core/requests";
import { ChatListQuery } from "@widgetarium/workspaces";
import type { ChatRowData } from "@widgetarium/workspaces";

export function useChatRow(chatId: string | null): ChatRowData | null {
	const { pinned, recents } = useQuery(ChatListQuery).data;
	const rows = [...pinned, ...recents];
	return rows.find((row) => row.id === chatId) ?? null;
}
