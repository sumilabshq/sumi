import { navigation } from "@sumi/navigation-plugin";
import { sumiHost } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { PaneBoard } from "./features/pane-board/ui/pane-board/pane-board.js";

export const panes = plugin("panes")
	.require(sumiHost, navigation)
	.apply((app) => {
		app.use(sumiHost).slots.paneBoard.replace(PaneBoard);
	});
