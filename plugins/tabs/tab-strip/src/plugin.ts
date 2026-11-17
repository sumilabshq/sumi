import { controlMenu } from "@sumi/control-menu-plugin";
import { navigation } from "@sumi/navigation-plugin";
import { shell, sumiHost } from "@sumi/sumi-host-plugin";
import { tabsView } from "@sumi/tabs-view-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { ControlRows } from "./features/tab-strip/ui/control-rows/control-rows.js";
import { GroupMenu } from "./features/tab-strip/ui/group-menu/group-menu.js";
import { TabKeys } from "./features/tab-strip/ui/tab-keys/tab-keys.js";
import { TabStrip } from "./features/tab-strip/ui/tab-strip/tab-strip.js";

export const tabStrip = plugin("tab-strip")
	.require(sumiHost, shell, controlMenu, navigation, tabsView)
	.apply((app) => {
		app.use(tabsView).view({
			id: "header",
			label: "Tabs in header",
			icon: "panel-top",
			title: TabStrip,
			side: null,
		});
		app.use(shell).layer(TabKeys);
		app.use(shell).layer(GroupMenu);
		app.use(controlMenu).slots.rows.add(ControlRows);
	});
