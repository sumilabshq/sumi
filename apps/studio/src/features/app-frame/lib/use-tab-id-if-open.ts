import { HeldTabsQuery } from "@widgetarium/app-host";
import { ChatListQuery } from "@sumi/chat-tabs";
import { useQuery } from "@widgetarium/data-framework";

export function useTabIdIfOpen(tabId: string | null): string | null {
	const held = useQuery(HeldTabsQuery).data.tabs;
	const { pinned, recents } = useQuery(ChatListQuery).data;
	const openIds = [...held, ...pinned, ...recents].map(({ id }) => id);
	return tabId !== null && openIds.includes(tabId) ? tabId : null;
}
