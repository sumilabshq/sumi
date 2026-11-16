import { event, gatewayEvent } from "@widgetarium/data-framework";
import { PinsGateway } from "./pins.gateway.js";

export const pinsChanged = event().from(gatewayEvent(PinsGateway, (gateway, fire) => gateway.pinsChanged(fire)));
