import { event, gatewayEvent } from "@widgetarium/core/requests";
import { InkActivityGateway } from "./ink-activity.gateway.js";

export const InkActivityChangedEvent = event("ink-activity-changed").from(
	gatewayEvent(InkActivityGateway, (gateway, fire) => gateway.inkActivityChanged(fire)),
);
