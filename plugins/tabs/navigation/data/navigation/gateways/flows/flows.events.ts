import { event, gatewayEvent } from "@widgetarium/data-framework";
import { TabsGateway } from "../tabs/tabs.gateway.js";

export const flowsChanged = event().from(gatewayEvent(TabsGateway, (gateway, fire) => gateway.flowsChanged(fire)));
