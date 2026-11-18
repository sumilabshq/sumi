import { tabStrip } from "@sumi/tab-strip-plugin";
import { tabsSidebar } from "@sumi/tabs-sidebar-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { ChatMenuItems } from "./features/artifacts/ui/chat-menu-items/chat-menu-items.js";
import { SidebarFold } from "./features/artifacts/ui/sidebar-fold/sidebar-fold.js";
import { StripArtifacts } from "./features/artifacts/ui/strip-artifacts/strip-artifacts.js";

export const artifacts = plugin("artifacts")
	.require(tabStrip, tabsSidebar)
	.apply((app) => {
		app.use(tabsSidebar).slots.tabActions.add(SidebarFold);
		app.use(tabStrip).slots.tabTools.add(StripArtifacts);
		app.use(tabStrip).slots.tabMenuItems.add(ChatMenuItems);
	});
