import { event, gatewayEvent } from "@widgetarium/data-framework";
import { PaneTreeGateway } from "./pane-tree.gateway.js";

export const panesChanged = event()
	.public()
	.from(gatewayEvent(PaneTreeGateway, (gateway, fire) => gateway.treeChanged(fire)));
