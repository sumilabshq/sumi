import { setups } from "@sumi/setups/implementation";
import { homePages } from "@sumi/home-pages-plugin";
import { windows } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { LauncherHome } from "./features/launcher/ui/launcher-home/launcher-home.js";
import metadata from "../metadata.json" with { type: "json" };

export const launcherHome = plugin("launcher-home")
	.describe(metadata)
	.require(homePages, windows)
	.apply((app) => {
		app.use(windows).module(setups);
		app.use(homePages).page({ id: "launcher", title: "Launcher", view: LauncherHome });
	});
