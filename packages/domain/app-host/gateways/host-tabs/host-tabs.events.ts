import { event, gatewayEvent } from "@widgetarium/core/requests";
import { HostTabsGateway } from "./host-tabs.gateway.js";

export const HostTabsChangedEvent = event("host-tabs-changed").from(
	gatewayEvent(HostTabsGateway, (gateway, fire) => gateway.tabsChanged(fire)),
);
