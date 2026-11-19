import { sumiHost } from "@sumi/sumi-host-plugin";
import { tabStrip } from "@sumi/tab-strip-plugin";
import { tabsSidebar } from "@sumi/tabs-sidebar-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { AssistantButton } from "./features/sub-pages/ui/assistant-button/assistant-button.js";
import { SidebarFold } from "./features/sub-pages/ui/sidebar-fold/sidebar-fold.js";
import { StripSubPages } from "./features/sub-pages/ui/strip-sub-pages/strip-sub-pages.js";
import { SubPageMenuItems } from "./features/sub-pages/ui/sub-page-menu-items/sub-page-menu-items.js";

export const subPages = plugin("sub-pages")
	.require(sumiHost, tabStrip, tabsSidebar)
	.apply((app) => {
		app.use(tabsSidebar).slots.tabActions.add(SidebarFold);
		app.use(tabStrip).slots.tabTools.add(StripSubPages);
		app.use(tabStrip).slots.tabMenuItems.add(SubPageMenuItems);
		app.use(sumiHost).slots.titleEnd.add(AssistantButton);
	});
