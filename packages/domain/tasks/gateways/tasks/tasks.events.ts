import { event, gatewayEvent } from "@widgetarium/core/requests";
import { TasksGateway } from "./tasks.gateway.js";

export const TasksChangedEvent = event("tasks-changed").from(
	gatewayEvent(TasksGateway, (gateway, fire) => gateway.boardChanged(fire)),
);
