import { event, gatewayEvent } from "@widgetarium/data-framework";
import { TasksGateway } from "./tasks.gateway.js";

export const tasksChanged = event().from(gatewayEvent(TasksGateway, (gateway, fire) => gateway.boardChanged(fire)));
