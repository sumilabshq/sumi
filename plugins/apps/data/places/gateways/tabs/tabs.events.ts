import { event, gatewayEvent } from "@widgetarium/data-framework";
import { TabsGateway } from "./tabs.gateway.js";

export const placedTabsChanged = event().from(
	gatewayEvent(TabsGateway, (gateway, fire) => gateway.placedTabsChanged(fire)),
);
