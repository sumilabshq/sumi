import { tabStrip } from "@sumi/tab-strip-plugin";
import { tabsView } from "@sumi/tabs-view-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { SidebarTitle } from "./features/sidebar-title/ui/sidebar-title/sidebar-title.js";
import { TabsSidebar } from "./features/tabs-sidebar/ui/tabs-sidebar/tabs-sidebar.js";
import metadata from "../metadata.json" with { type: "json" };

export const tabsSidebar = plugin("tabs-sidebar")
	.describe(metadata)
	.require(tabsView, tabStrip)
	.apply((app) => {
		app.use(tabsView).view({
			id: "sidebar",
			label: "Tabs in sidebar",
			icon: "panel-left",
			title: SidebarTitle,
			side: TabsSidebar,
		});
	});
