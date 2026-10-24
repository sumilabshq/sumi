import { event, gatewayEvent } from "@widgetarium/core/requests";
import { CommandMenuGateway } from "./command-menu.gateway.js";

export const CommandMenuChangedEvent = event("command-menu-changed").from(
	gatewayEvent(CommandMenuGateway, (gateway, fire) => gateway.menuChanged(fire)),
);
