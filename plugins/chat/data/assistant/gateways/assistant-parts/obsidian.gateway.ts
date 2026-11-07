import type { AssistantParts, ObsidianHosts } from "./assistant-parts.gateway.js";
import { attachmentFilesIn, portAssistantParts } from "./port.gateway.js";

export function obsidianAssistantParts({ obsidianAssistant, attachments }: ObsidianHosts): AssistantParts {
	return portAssistantParts(obsidianAssistant, attachmentFilesIn(attachments));
}
