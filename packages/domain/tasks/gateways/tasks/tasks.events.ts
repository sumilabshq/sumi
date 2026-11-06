import { event, gatewayEvent } from "@widgetarium/data-framework";
import { TasksGateway } from "./tasks.gateway.js";

export const TasksChangedEvent = event("tasks-changed").from(
	gatewayEvent(TasksGateway, (gateway, fire) => gateway.boardChanged(fire)),
);
