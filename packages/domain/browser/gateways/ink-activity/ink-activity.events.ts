import { event, gatewayEvent } from "@widgetarium/framework";
import { InkActivityGateway } from "./ink-activity.gateway.js";

export const InkActivityChangedEvent = event("ink-activity-changed").from(
	gatewayEvent(InkActivityGateway, (gateway, fire) => gateway.inkActivityChanged(fire)),
);
