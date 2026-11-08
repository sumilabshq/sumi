import { apps } from "@sumi/apps-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { LazyTerminalView } from "./features/terminal/lib/lazy-terminal-view.js";
import { TERMINAL_ICON } from "./features/terminal/lib/terminal-icon.js";

export const terminal = plugin()
	.require(apps)
	.fill(apps.apps.add({ id: "terminal", title: "Terminal", icon: TERMINAL_ICON, view: LazyTerminalView }));
