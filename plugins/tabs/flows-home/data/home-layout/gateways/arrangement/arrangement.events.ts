import { event, gatewayEvent } from "@widgetarium/data-framework";
import { ArrangementGateway } from "./arrangement.gateway.js";

export const arrangementChanged = event().from(
	gatewayEvent(ArrangementGateway, (gateway, fire) => gateway.arrangementChanged(fire)),
);
