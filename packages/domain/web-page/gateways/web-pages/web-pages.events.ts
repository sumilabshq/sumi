import { event, gatewayEvent } from "@widgetarium/framework";
import { WebPagesGateway } from "./web-pages.gateway.js";

export const WebPagesChangedEvent = event("web-pages-changed").from(
	gatewayEvent(WebPagesGateway, (gateway, fire) => gateway.pagesChanged(fire)),
);
