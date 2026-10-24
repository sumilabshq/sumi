import { event, gatewayEvent } from "@widgetarium/core/requests";
import { TabsColumnGateway } from "./tabs-column.gateway.js";

export const TabsColumnChangedEvent = event("tabs-column-changed").from(
	gatewayEvent(TabsColumnGateway, (gateway, fire) => gateway.columnChanged(fire)),
);
