import { event, gatewayEvent } from "@widgetarium/data-framework";
import { AgentJobsGateway } from "./agent-jobs.gateway.js";

export const JobsChangedEvent = event("jobs-changed").from(
	gatewayEvent(AgentJobsGateway, (gateway, fire) => gateway.jobsChanged(() => fire())),
);
