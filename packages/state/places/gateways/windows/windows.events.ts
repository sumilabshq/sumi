import { event, gatewayEvent } from "@widgetarium/core/requests";
import { WindowsGateway } from "./windows.gateway.js";

export const WindowsChangedEvent = event("windows-changed").from(
	gatewayEvent(WindowsGateway, (gateway, fire) => gateway.windowsChanged(fire)),
);
