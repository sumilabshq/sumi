import { event, gatewayEvent } from "@widgetarium/core/requests";
import { AssistantSessionGateway } from "./assistant-session.gateway.js";

export const AssistantSessionChangedEvent = event("assistant-session-changed").from(
	gatewayEvent(AssistantSessionGateway, (gateway, fire) => gateway.sessionChanged(fire)),
);
