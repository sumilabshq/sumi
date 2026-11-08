import { event, gatewayEvent } from "@widgetarium/data-framework";
import { AgentActivityGateway } from "./agent-activity.gateway.js";

export const agentActivityChanged = event().from(
	gatewayEvent(AgentActivityGateway, (gateway, fire) => gateway.agentActivityChanged(fire)),
);
