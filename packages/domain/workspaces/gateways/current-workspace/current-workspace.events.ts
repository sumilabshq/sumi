import { event, gatewayEvent } from "@widgetarium/data-framework";
import { CurrentWorkspaceGateway } from "./current-workspace.gateway.js";

export const currentWorkspaceChanged = event().from(
	gatewayEvent(CurrentWorkspaceGateway, (gateway, fire) => gateway.currentWorkspaceChanged(fire)),
);
