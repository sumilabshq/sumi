import { event, gatewayEvent } from "@widgetarium/framework";
import { PaneTreeGateway } from "./pane-tree.gateway.js";

export const PanesChangedEvent = event("panes-changed").from(
	gatewayEvent(PaneTreeGateway, (gateway, fire) => gateway.treeChanged(fire)),
);
