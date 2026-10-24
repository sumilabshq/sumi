import { event, gatewayEvent } from "@widgetarium/core/requests";
import { EssentialsGateway } from "./essentials.gateway.js";

export const EssentialsChangedEvent = event("essentials-changed").from(
	gatewayEvent(EssentialsGateway, (gateway, fire) => gateway.essentialsChanged(fire)),
);
