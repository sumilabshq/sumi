import { event, gatewayEvent } from "@widgetarium/framework";
import { AssistantSetupGateway } from "./assistant-setup.gateway.js";

export const AssistantSetupChangedEvent = event("assistant-setup-changed").from(
	gatewayEvent(AssistantSetupGateway, (gateway, fire) => gateway.setupChanged(fire)),
);
