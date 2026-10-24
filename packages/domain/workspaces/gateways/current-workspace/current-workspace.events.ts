import { event, gatewayEvent } from "@widgetarium/core/requests";
import { CurrentWorkspaceGateway } from "./current-workspace.gateway.js";

export const CurrentWorkspaceChangedEvent = event("current-workspace-changed").from(
	gatewayEvent(CurrentWorkspaceGateway, (gateway, fire) => gateway.currentWorkspaceChanged(fire)),
);
