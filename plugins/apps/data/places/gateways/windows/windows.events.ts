import { event, gatewayEvent } from "@widgetarium/data-framework";
import { WindowsGateway } from "./windows.gateway.js";

export const windowsChanged = event().from(
	gatewayEvent(WindowsGateway, (gateway, fire) => gateway.windowsChanged(fire)),
);
