import { shell, sumiHost } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { FlowsSidebar } from "./features/flows-column/ui/flows-sidebar/flows-sidebar.js";
import { SidebarTitle } from "./features/sidebar-title/ui/sidebar-title/sidebar-title.js";
import { flowsWindowProviderOf } from "./shared/ui/flows-window-provider/flows-window-provider.js";

export const flowsSidebar = plugin("flows-sidebar")
	.require(sumiHost, shell)
	.apply((app) => {
		app.use(shell).provider(flowsWindowProviderOf);
		app.use(sumiHost).slots.titleTabs.add(SidebarTitle);
		app.use(sumiHost).slots.frameStart.add(FlowsSidebar);
	});
