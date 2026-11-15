import { refuseMissingTab } from "../../../shared/lib/tab-places.js";
import type { Sidebar } from "../../../shared/lib/tab-lists.js";
import type { GroupCreate } from "../../../shared/schema/group-asks.schema.js";

export function refuseNewGroup(sidebar: Sidebar, { tabIds }: GroupCreate): string | null {
	return tabIds.map((tabId) => refuseMissingTab(sidebar, tabId)).find((found) => found !== null) ?? null;
}
