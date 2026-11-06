import { event, gatewayEvent } from "@widgetarium/framework";
import { AccessAsksGateway } from "./access-asks.gateway.js";

export const AccessAsksChangedEvent = event("access-asks-changed").from(
	gatewayEvent(AccessAsksGateway, (gateway, fire) => gateway.accessAsksChanged(fire)),
);
