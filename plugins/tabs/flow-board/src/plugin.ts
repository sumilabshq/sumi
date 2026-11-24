import { flowStrip } from "@sumi/flow-strip-plugin";
import { navigation } from "@sumi/navigation-plugin";
import { sumiHost } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { FlowBoard } from "./features/flow-board/ui/flow-board/flow-board.js";

export const flowBoard = plugin("flow-board")
	.require(sumiHost, navigation, flowStrip)
	.apply((app) => {
		app.use(sumiHost).slots.paneBoard.replace(FlowBoard);
	});
