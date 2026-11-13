import { event, gatewayEvent } from "@widgetarium/data-framework";
import { ProcessesGateway } from "./processes.gateway.js";

export const processOutputChanged = event().from(
	gatewayEvent(ProcessesGateway, (gateway, fire) => gateway.onOutputChanged(fire)),
);
