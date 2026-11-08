import { refusePlace, refuseTab } from "../../../shared/lib/tab-places.js";
import type { Sidebar } from "../../../shared/lib/tab-lists.js";
import type { GroupCreate } from "../../../shared/schema/group-asks.schema.js";

export function refuseNewGroup(sidebar: Sidebar, { place, tabIds }: GroupCreate, chatId: string): string | null {
	return (
		refusePlace(place, chatId) ??
		tabIds.map((tabId) => refuseTab(sidebar, tabId, chatId)).find((found) => found !== null) ??
		null
	);
}
