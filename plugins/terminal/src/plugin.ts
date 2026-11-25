import { apps } from "@sumi/apps-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { LazyTerminalView } from "./features/terminal/lib/lazy-terminal-view.js";
import { TERMINAL_ICON } from "./features/terminal/lib/terminal-icon.js";
import metadata from "../metadata.json" with { type: "json" };

export const terminal = plugin("terminal")
	.describe(metadata)
	.require(apps)
	.apply((app) => {
		app.use(apps).app({ id: "terminal", title: "Terminal", icon: TERMINAL_ICON, view: LazyTerminalView });
	});
