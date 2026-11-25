import { sumiHost } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { ControlMenuButton } from "./features/control-menu/ui/control-menu/control-menu-button.js";
import metadata from "../metadata.json" with { type: "json" };

export const controlMenu = plugin("control-menu")
	.describe(metadata)
	.require(sumiHost)
	.apply((app) => {
		app.use(sumiHost).slots.titleEnd.add(ControlMenuButton);
	});
