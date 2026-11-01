import { event, gatewayEvent } from "@widgetarium/core/requests";
import { ThemeGateway } from "./theme.gateway.js";

export const ThemeChangedEvent = event("theme-changed").from(
	gatewayEvent(ThemeGateway, (gateway, fire) => gateway.themeChanged(fire)),
);
