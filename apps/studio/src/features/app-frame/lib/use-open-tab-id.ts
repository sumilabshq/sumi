import { ChatListQuery, HeldTabsQuery } from "@widgetarium/app-host";
import { useQuery } from "@widgetarium/core/requests";

export function useOpenTabId(tabId: string | null): string | null {
	const held = useQuery(HeldTabsQuery).data.tabs;
	const { pinned, recents } = useQuery(ChatListQuery).data;
	const openIds = [...held, ...pinned, ...recents].map(({ id }) => id);
	return openIds.find((id) => id === tabId) ?? null;
}
