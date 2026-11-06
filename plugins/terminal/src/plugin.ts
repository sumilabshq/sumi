import { AppsPlugin, AppsSlot } from "@sumi/apps-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { LazyTerminalView } from "./lazy-terminal-view.js";

export const TerminalPlugin = plugin("terminal")
	.require(AppsPlugin)
	.fill(AppsSlot({ id: "terminal", title: "Terminal", icon: "terminal", view: LazyTerminalView }));
