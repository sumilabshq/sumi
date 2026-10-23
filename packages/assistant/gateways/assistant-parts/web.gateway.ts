import { NO_ASSISTANT } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { PortAssistantSessionGateway } from "../assistant-session/port.gateway.js";
import { PortAssistantSetupGateway } from "../assistant-setup/port.gateway.js";
import { WebAttachmentFilesGateway } from "../attachment-files/web.gateway.js";
import { NoAttachmentFolderGateway } from "../attachment-folder/none.gateway.js";
import { NoClaudeOptionsGateway } from "../claude-options/none.gateway.js";
import { SystemClockGateway } from "../clock/system.gateway.js";
import { NoFileDropGateway } from "../file-drop/none.gateway.js";
import { NoWorkingFolderGateway } from "../working-folder/none.gateway.js";
import type { AssistantGateways } from "./assistant-parts.gateway.js";

export function webAssistantGateways(port: AssistantPort = NO_ASSISTANT): AssistantGateways {
	return {
		assistantSessionGateway: new PortAssistantSessionGateway(port),
		assistantSetupGateway: new PortAssistantSetupGateway(port),
		attachmentFilesGateway: new WebAttachmentFilesGateway(),
		clockGateway: new SystemClockGateway(),
		attachmentFolderGateway: new NoAttachmentFolderGateway(),
		claudeOptionsGateway: new NoClaudeOptionsGateway(),
		workingFolderGateway: new NoWorkingFolderGateway(),
		fileDropGateway: new NoFileDropGateway(),
	};
}
