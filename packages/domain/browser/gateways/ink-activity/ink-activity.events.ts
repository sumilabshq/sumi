import { event, gatewayEvent } from "@widgetarium/data-framework";
import { InkActivityGateway } from "./ink-activity.gateway.js";

export const inkActivityChanged = event()
	.public()
	.from(gatewayEvent(InkActivityGateway, (gateway, fire) => gateway.inkActivityChanged(fire)));
