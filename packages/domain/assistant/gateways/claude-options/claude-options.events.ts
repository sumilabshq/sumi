import { event, gatewayEvent } from "@widgetarium/data-framework";
import { ClaudeOptionsGateway } from "./claude-options.gateway.js";

export const ClaudeOptionsChangedEvent = event("claude-options-changed").from(
	gatewayEvent(ClaudeOptionsGateway, (gateway, fire) => gateway.claudeOptionsChanged(fire)),
);
