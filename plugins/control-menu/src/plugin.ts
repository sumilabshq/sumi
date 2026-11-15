import { sumiHost } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { ControlMenuButton } from "./features/control-menu/ui/control-menu/control-menu-button.js";

export const controlMenu = plugin("control-menu")
	.require(sumiHost)
	.apply((app) => {
		app.use(sumiHost).slots.titleEnd.add(ControlMenuButton);
	});
