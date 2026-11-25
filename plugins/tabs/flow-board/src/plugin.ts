import { flowStrip } from "@sumi/flow-strip-plugin";
import { navigation } from "@sumi/navigation-plugin";
import { sumiHost } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { FlowBoard } from "./features/flow-board/ui/flow-board/flow-board.js";
import metadata from "../metadata.json" with { type: "json" };

export const flowBoard = plugin("flow-board")
	.describe(metadata)
	.require(sumiHost, navigation, flowStrip)
	.apply((app) => {
		app.use(sumiHost).slots.paneBoard.replace(FlowBoard);
	});
