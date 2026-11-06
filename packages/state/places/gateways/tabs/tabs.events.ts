import { event, gatewayEvent } from "@widgetarium/framework";
import { TabsGateway } from "./tabs.gateway.js";

export const PlacedTabsChangedEvent = event("placed-tabs-changed").from(
	gatewayEvent(TabsGateway, (gateway, fire) => gateway.placedTabsChanged(fire)),
);
