import { event, gatewayEvent } from "@widgetarium/data-framework";
import { CoreChangesGateway } from "./core-changes.gateway.js";

export const StudioCoreChangedEvent = event("studio-core-changed")
	.public()
	.from(gatewayEvent(CoreChangesGateway, (gateway, fire) => gateway.coreChanged(fire)));
