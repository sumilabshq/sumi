import { event, gatewayEvent } from "@widgetarium/data-framework";
import { FrameSidesGateway } from "./frame-sides.gateway.js";

export const sidesChanged = event().from(
	gatewayEvent(FrameSidesGateway, (gateway, fire) => gateway.sidesChanged(fire)),
);
