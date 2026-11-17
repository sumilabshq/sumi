import { event, gatewayEvent } from "@widgetarium/data-framework";
import { SidePeeksGateway } from "./side-peeks.gateway.js";

export const peeksChanged = event().from(gatewayEvent(SidePeeksGateway, (gateway, fire) => gateway.peeksChanged(fire)));
