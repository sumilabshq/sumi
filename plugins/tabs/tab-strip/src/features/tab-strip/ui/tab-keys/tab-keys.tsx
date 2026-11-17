import type { ReactNode } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { stripItemsOf } from "../../lib/strip-items.js";
import { useNewTabs } from "../../lib/use-new-tabs.js";
import { useStripKeys } from "../../lib/use-strip-keys.js";
import { useTabActs } from "../../lib/use-tab-acts.js";

export function TabKeys(): ReactNode {
	const sidebar = useQuery(appHost.tabs.tabsSidebar).data;
	const items = stripItemsOf(sidebar);
	const acts = useTabActs({
		items,
		newTabList: sidebar.newTabList,
	});
	useStripKeys({
		items,
		newTabs: useNewTabs(),
		show: acts.show,
	});
	return null;
}
