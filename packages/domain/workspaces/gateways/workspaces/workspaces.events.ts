import { event, gatewayEvent } from "@widgetarium/data-framework";
import { WorkspacesGateway } from "./workspaces.gateway.js";

export const workspacesChanged = event().from(
	gatewayEvent(WorkspacesGateway, (gateway, fire) => gateway.workspacesChanged(fire)),
);
