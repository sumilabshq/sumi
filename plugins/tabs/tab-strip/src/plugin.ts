import { controlMenu } from "@sumi/control-menu-plugin";
import { navigation } from "@sumi/navigation-plugin";
import { sumiHost } from "@sumi/sumi-host-plugin";
import { tabGroups } from "@sumi/tab-groups-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { ControlRows } from "./features/tab-strip/ui/control-rows/control-rows.js";
import { TabStrip } from "./features/tab-strip/ui/tab-strip/tab-strip.js";

export const tabStrip = plugin("tab-strip")
	.require(sumiHost, controlMenu, navigation, tabGroups)
	.apply((app) => {
		app.use(sumiHost).slots.titleTabs.add(TabStrip);
		app.use(controlMenu).slots.rows.add(ControlRows);
	});
