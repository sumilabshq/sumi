import { event, gatewayEvent } from "@widgetarium/core/requests";
import { AgentActivityGateway } from "./agent-activity.gateway.js";

export const AgentActivityChangedEvent = event("agent-activity-changed").from(
	gatewayEvent(AgentActivityGateway, (gateway, fire) => gateway.agentActivityChanged(fire)),
);
