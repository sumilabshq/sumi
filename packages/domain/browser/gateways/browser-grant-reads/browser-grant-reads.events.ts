import { event, gatewayEvent } from "@widgetarium/data-framework";
import { BrowserGrantReadsGateway } from "./browser-grant-reads.gateway.js";

export const grantsChanged = event().from(
	gatewayEvent(BrowserGrantReadsGateway, (gateway, fire) => gateway.grantsChanged(fire)),
);
