import { event, gatewayEvent } from "@widgetarium/data-framework";
import { CoreChangesGateway } from "./core-changes.gateway.js";

export const studioCoreChanged = event()
	.public()
	.from(gatewayEvent(CoreChangesGateway, (gateway, fire) => gateway.coreChanged(fire)));
