import { event, gatewayEvent } from "@widgetarium/framework";
import { TerminalSessionsGateway } from "./terminal-sessions.gateway.js";

export const TerminalOutputChangedEvent = event("terminal-output-changed").from(
	gatewayEvent(TerminalSessionsGateway, (gateway, fire) => gateway.onOutputChanged(fire)),
);
