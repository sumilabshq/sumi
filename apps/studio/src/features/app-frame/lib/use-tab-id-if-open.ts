import { appHost } from "@widgetarium/app-host/contract";
import { chatTabs } from "@sumi/chat-tabs/contract";
import { useQuery } from "@widgetarium/data-framework";

export function useTabIdIfOpen(tabId: string | null): string | null {
	const held = useQuery(appHost.tabs.held).data.tabs;
	const { pinned, recents } = useQuery(chatTabs.chatList.all).data;
	const openIds = [...held, ...pinned, ...recents].map(({ id }) => id);
	return tabId !== null && openIds.includes(tabId) ? tabId : null;
}
