import { event, gatewayEvent } from "@widgetarium/data-framework";
import { ThemeGateway } from "./theme.gateway.js";

export const ThemeChangedEvent = event("theme-changed").from(
	gatewayEvent(ThemeGateway, (gateway, fire) => gateway.themeChanged(fire)),
);
