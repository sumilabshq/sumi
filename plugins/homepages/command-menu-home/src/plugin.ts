import { homePages } from "@sumi/home-pages-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { CommandMenuHome } from "./features/command-menu-home/ui/command-menu-home/command-menu-home.js";

export const commandMenuHome = plugin("command-menu-home")
	.require(homePages)
	.apply((app) => {
		app.use(homePages).page({ id: "command-menu", title: "Command menu", view: CommandMenuHome });
	});
