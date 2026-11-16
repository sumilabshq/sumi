import { event, gatewayEvent } from "@widgetarium/data-framework";
import { TabsGateway } from "@widgetarium/navigation/lib/gateways/tabs/tabs.gateway";

export const placedTabsChanged = event().from(
	gatewayEvent(TabsGateway, (gateway, fire) => gateway.placedTabsChanged(fire)),
);
