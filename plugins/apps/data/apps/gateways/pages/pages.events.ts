import { event, gatewayEvent } from "@widgetarium/data-framework";
import { PagesGateway } from "./pages.gateway.js";

export const keptPagesChanged = event().from(gatewayEvent(PagesGateway, (gateway, fire) => gateway.pagesChanged(fire)));
