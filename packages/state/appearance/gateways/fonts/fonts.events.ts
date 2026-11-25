import { event, gatewayEvent } from "@widgetarium/data-framework";
import { FontsGateway } from "./fonts.gateway.js";

export const fontsChanged = event().from(gatewayEvent(FontsGateway, (gateway, fire) => gateway.fontsChanged(fire)));
