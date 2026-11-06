import { event, gatewayEvent } from "@widgetarium/data-framework";
import { TerminalSessionsGateway } from "./terminal-sessions.gateway.js";

export const TerminalOutputChangedEvent = event("terminal-output-changed").from(
	gatewayEvent(TerminalSessionsGateway, (gateway, fire) => gateway.onOutputChanged(fire)),
);
