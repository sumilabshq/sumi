import { event, gatewayEvent } from "@widgetarium/data-framework";
import { TabsGateway } from "../tabs/tabs.gateway.js";
import { joinedWindowsChanged } from "../../features/windows/lib/joined-changes.js";

export const windowsChanged = event().from(
	gatewayEvent(TabsGateway, (gateway, fire) => joinedWindowsChanged(gateway, fire)),
);
