import { event, gatewayEvent } from "@widgetarium/data-framework";
import { ShownViewGateway } from "./shown-view.gateway.js";

export const ShownViewChangedEvent = event("shown-view-changed").from(
	gatewayEvent(ShownViewGateway, (gateway, fire) => gateway.shownViewChanged(fire)),
);
