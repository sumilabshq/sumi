import { event, gatewayEvent } from "@widgetarium/framework";
import { WorkspacesGateway } from "./workspaces.gateway.js";

export const WorkspacesChangedEvent = event("workspaces-changed").from(
	gatewayEvent(WorkspacesGateway, (gateway, fire) => gateway.workspacesChanged(fire)),
);
