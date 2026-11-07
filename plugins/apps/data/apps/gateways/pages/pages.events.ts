import { event, gatewayEvent } from "@widgetarium/data-framework";
import { PagesGateway } from "./pages.gateway.js";

export const KeptPagesChangedEvent = event("kept-pages-changed").from(
	gatewayEvent(PagesGateway, (gateway, fire) => gateway.pagesChanged(fire)),
);
