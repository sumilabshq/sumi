import { event, gatewayEvent } from "@widgetarium/core/requests";
import { WorkingFoldersGateway } from "./working-folders.gateway.js";

export const WorkingFolderChangedEvent = event("working-folder-changed").from(
	gatewayEvent(WorkingFoldersGateway, (gateway, fire) => gateway.workingFolderChanged(fire)),
);
