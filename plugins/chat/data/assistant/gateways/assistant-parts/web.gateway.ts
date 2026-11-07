import { NoAttachmentFilesGateway } from "../attachment-files/none.gateway.js";
import type { AssistantParts, WebHosts } from "./assistant-parts.gateway.js";
import { portAssistantParts } from "./port.gateway.js";

export function webAssistantParts({ webAssistant }: WebHosts): AssistantParts {
	return portAssistantParts(webAssistant, new NoAttachmentFilesGateway());
}
