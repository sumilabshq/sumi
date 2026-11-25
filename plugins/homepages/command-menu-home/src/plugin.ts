import { homePages } from "@sumi/home-pages-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { CommandMenuHome } from "./features/command-menu-home/ui/command-menu-home/command-menu-home.js";
import metadata from "../metadata.json" with { type: "json" };

export const commandMenuHome = plugin("command-menu-home")
	.describe(metadata)
	.require(homePages)
	.apply((app) => {
		app.use(homePages).page({ id: "command-menu", title: "Command menu", view: CommandMenuHome });
	});
