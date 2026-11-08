import { event, gatewayEvent } from "@widgetarium/data-framework";
import { AgentJobsGateway } from "./agent-jobs.gateway.js";

export const jobsChanged = event().from(
	gatewayEvent(AgentJobsGateway, (gateway, fire) => gateway.jobsChanged(() => fire())),
);
