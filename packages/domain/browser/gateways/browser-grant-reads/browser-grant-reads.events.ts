import { event, gatewayEvent } from "@widgetarium/core/requests";
import { BrowserGrantReadsGateway } from "./browser-grant-reads.gateway.js";

export const GrantsChangedEvent = event("grants-changed").from(
	gatewayEvent(BrowserGrantReadsGateway, (gateway, fire) => gateway.grantsChanged(fire)),
);
