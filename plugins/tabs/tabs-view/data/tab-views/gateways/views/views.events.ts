import { event, gatewayEvent } from "@widgetarium/data-framework";
import { ViewsGateway } from "./views.gateway.js";

export const viewsChanged = event().from(gatewayEvent(ViewsGateway, (gateway, fire) => gateway.viewsChanged(fire)));
