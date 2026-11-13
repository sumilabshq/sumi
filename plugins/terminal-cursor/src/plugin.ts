import { shell } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { TerminalCursorLayer } from "./features/terminal-cursor/ui/terminal-cursor-layer/terminal-cursor-layer.js";

export const terminalCursor = plugin("terminal-cursor")
	.require(shell)
	.apply((app) => {
		app.use(shell).layer(TerminalCursorLayer);
	});
