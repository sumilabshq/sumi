import { event, gatewayEvent } from "@widgetarium/core/requests";
import { WebPagesGateway } from "./web-pages.gateway.js";

export const WebPagesChangedEvent = event("web-pages-changed").from(
	gatewayEvent(WebPagesGateway, (gateway, fire) => gateway.pagesChanged(fire)),
);
