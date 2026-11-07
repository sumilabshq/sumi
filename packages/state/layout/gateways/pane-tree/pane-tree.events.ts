import { event, gatewayEvent } from "@widgetarium/data-framework";
import { PaneTreeGateway } from "./pane-tree.gateway.js";

export const PanesChangedEvent = event("panes-changed").public().from(
	gatewayEvent(PaneTreeGateway, (gateway, fire) => gateway.treeChanged(fire)),
);
