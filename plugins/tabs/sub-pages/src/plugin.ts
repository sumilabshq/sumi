import { controlMenu } from "@sumi/control-menu-plugin";
import { tabStrip } from "@sumi/tab-strip-plugin";
import { tabsSidebar } from "@sumi/tabs-sidebar-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { AssistantRow } from "./features/sub-pages/ui/assistant-row/assistant-row.js";
import { SidebarFold } from "./features/sub-pages/ui/sidebar-fold/sidebar-fold.js";
import { StripSubPages } from "./features/sub-pages/ui/strip-sub-pages/strip-sub-pages.js";
import { SubPageMenuItems } from "./features/sub-pages/ui/sub-page-menu-items/sub-page-menu-items.js";

export const subPages = plugin("sub-pages")
	.require(controlMenu, tabStrip, tabsSidebar)
	.apply((app) => {
		app.use(tabsSidebar).slots.tabActions.add(SidebarFold);
		app.use(tabStrip).slots.tabTools.add(StripSubPages);
		app.use(tabStrip).slots.tabMenuItems.add(SubPageMenuItems);
		app.use(controlMenu).slots.rows.add(AssistantRow);
	});
