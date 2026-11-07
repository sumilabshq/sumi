import { event, gatewayEvent } from "@widgetarium/data-framework";
import { BrowserPagesGateway } from "./browser-pages.gateway.js";

export const PagesChangedEvent = event("pages-changed").public().from(
	gatewayEvent(BrowserPagesGateway, (gateway, fire) => gateway.pagesChanged(fire)),
);

export const PageLooksChangedEvent = event("page-looks-changed").from(
	gatewayEvent(BrowserPagesGateway, (gateway, fire) => gateway.looksChanged(fire)),
);
