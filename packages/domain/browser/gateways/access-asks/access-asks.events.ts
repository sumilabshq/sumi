import { event, gatewayEvent } from "@widgetarium/data-framework";
import { AccessAsksGateway } from "./access-asks.gateway.js";

export const accessAsksChanged = event()
	.public()
	.from(gatewayEvent(AccessAsksGateway, (gateway, fire) => gateway.accessAsksChanged(fire)));
