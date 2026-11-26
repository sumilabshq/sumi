import { useOptionalQuery } from "@widgetarium/data-framework";
import { workspaces } from "@widgetarium/workspaces/contract";

export function useChatTitle(chatId: string): string | null {
	const records = useOptionalQuery(workspaces.chats.chatRecords).data;
	return records?.chats.find(({ id }) => id === chatId)?.title ?? null;
}
