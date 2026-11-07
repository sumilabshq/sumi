import { event, gatewayEvent } from "@widgetarium/data-framework";
import { EssentialsGateway } from "./essentials.gateway.js";

export const EssentialsChangedEvent = event("essentials-changed").from(
	gatewayEvent(EssentialsGateway, (gateway, fire) => gateway.essentialsChanged(fire)),
);
