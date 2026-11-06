import { AppsPlugin, AppsSlot } from "@sumi/apps-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { LazyTerminalView } from "./lazy-terminal-view.js";
import { TERMINAL_ICON } from "./terminal-icon.js";

export const TerminalPlugin = plugin("terminal")
	.require(AppsPlugin)
	.fill(AppsSlot({ id: "terminal", title: "Terminal", icon: TERMINAL_ICON, view: LazyTerminalView }));
