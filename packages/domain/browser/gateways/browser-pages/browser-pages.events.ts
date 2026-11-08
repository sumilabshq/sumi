import { event, gatewayEvent } from "@widgetarium/data-framework";
import { BrowserPagesGateway } from "./browser-pages.gateway.js";

export const pagesChanged = event()
	.public()
	.from(gatewayEvent(BrowserPagesGateway, (gateway, fire) => gateway.pagesChanged(fire)));

export const pageLooksChanged = event().from(
	gatewayEvent(BrowserPagesGateway, (gateway, fire) => gateway.looksChanged(fire)),
);
