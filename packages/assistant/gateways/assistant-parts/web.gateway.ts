import { NO_ASSISTANT } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { PortAssistantSessionGateway } from "../assistant-session/port.gateway.js";
import { PortAssistantSetupGateway } from "../assistant-setup/port.gateway.js";
import { WebAttachmentFilesGateway } from "../attachment-files/web.gateway.js";
import { SystemClockGateway } from "../clock/system.gateway.js";
import type { AssistantGateways } from "./assistant-parts.gateway.js";

export function webAssistantGateways(port: AssistantPort = NO_ASSISTANT): AssistantGateways {
	return {
		assistantSessionGateway: new PortAssistantSessionGateway(port),
		assistantSetupGateway: new PortAssistantSetupGateway(port),
		attachmentFilesGateway: new WebAttachmentFilesGateway(),
		clockGateway: new SystemClockGateway(),
	};
}
