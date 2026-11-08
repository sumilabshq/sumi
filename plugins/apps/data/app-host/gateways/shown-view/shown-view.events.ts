import { event, gatewayEvent } from "@widgetarium/data-framework";
import { ShownViewGateway } from "./shown-view.gateway.js";

export const shownViewChanged = event().from(
	gatewayEvent(ShownViewGateway, (gateway, fire) => gateway.shownViewChanged(fire)),
);
