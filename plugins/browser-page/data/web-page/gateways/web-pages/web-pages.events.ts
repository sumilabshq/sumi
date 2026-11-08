import { event, gatewayEvent } from "@widgetarium/data-framework";
import { WebPagesGateway } from "./web-pages.gateway.js";

export const pagesChanged = event().from(gatewayEvent(WebPagesGateway, (gateway, fire) => gateway.pagesChanged(fire)));
