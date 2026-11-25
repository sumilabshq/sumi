import { navigation } from "@sumi/navigation-plugin";
import { sumiHost } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { PaneBoard } from "./features/pane-board/ui/pane-board/pane-board.js";
import metadata from "../metadata.json" with { type: "json" };

export const panes = plugin("panes")
	.describe(metadata)
	.require(sumiHost, navigation)
	.apply((app) => {
		app.use(sumiHost).slots.paneBoard.replace(PaneBoard);
	});
