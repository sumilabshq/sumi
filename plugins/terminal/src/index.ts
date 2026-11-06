import { lazy } from "react";
import { AppsPlugin, AppsSlot } from "@sumi/apps-plugin";
import { plugin } from "@widgetarium/plugin-framework";

const TerminalView = lazy(async () => ({ default: (await import("./terminal-view.js")).TerminalView }));

export const TerminalPlugin = plugin("terminal")
	.require(AppsPlugin)
	.fill(AppsSlot({ id: "terminal", title: "Terminal", icon: "terminal", view: TerminalView }));
