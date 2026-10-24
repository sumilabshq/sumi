import { event, gatewayEvent } from "@widgetarium/core/requests";
import { FrameSidesGateway } from "./frame-sides.gateway.js";

export const FrameSidesChangedEvent = event("frame-sides-changed").from(
	gatewayEvent(FrameSidesGateway, (gateway, fire) => gateway.sidesChanged(fire)),
);
