import { event, gatewayEvent } from "@widgetarium/data-framework";
import { WebPagesGateway } from "./web-pages.gateway.js";

export const webPagesChanged = event().from(
	gatewayEvent(WebPagesGateway, (gateway, fire) => gateway.pagesChanged(fire)),
);
