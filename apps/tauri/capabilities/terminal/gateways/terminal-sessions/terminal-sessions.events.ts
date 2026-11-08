import { event, gatewayEvent } from "@widgetarium/data-framework";
import { TerminalSessionsGateway } from "./terminal-sessions.gateway.js";

export const outputChanged = event().from(
	gatewayEvent(TerminalSessionsGateway, (gateway, fire) => gateway.onOutputChanged(fire)),
);
