import { event, gatewayEvent } from "@widgetarium/data-framework";
import { FrameSidesGateway } from "./frame-sides.gateway.js";

export const frameSidesChanged = event().from(
	gatewayEvent(FrameSidesGateway, (gateway, fire) => gateway.sidesChanged(fire)),
);
