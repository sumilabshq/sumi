import { event, gatewayEvent } from "@widgetarium/data-framework";
import { CommandMenuGateway } from "./command-menu.gateway.js";

export const commandMenuChanged = event().from(
	gatewayEvent(CommandMenuGateway, (gateway, fire) => gateway.menuChanged(fire)),
);
