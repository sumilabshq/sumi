import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { PortAssistantSessionGateway } from "../assistant-session/port.gateway.js";
import { PortAssistantSetupGateway } from "../assistant-setup/port.gateway.js";
import { PrivateFolderAttachmentFilesGateway } from "../attachment-files/private-folder.gateway.js";
import type { PrivateFolder } from "../attachment-files/private-folder.gateway.js";
import { NoAttachmentFolderGateway } from "../attachment-folder/none.gateway.js";
import { NoClaudeOptionsGateway } from "../claude-options/none.gateway.js";
import { SystemClockGateway } from "../clock/system.gateway.js";
import { NoFileDropGateway } from "../file-drop/none.gateway.js";
import { NoWorkingFolderGateway } from "../working-folder/none.gateway.js";
import type { AssistantGateways } from "./assistant-parts.gateway.js";

export interface ObsidianAssistantHold {
	readonly port: AssistantPort;
	readonly privateFolder: PrivateFolder;
	readonly folder: string;
}

export function obsidianAssistantGateways({ port, privateFolder, folder }: ObsidianAssistantHold): AssistantGateways {
	return {
		assistantSessionGateway: new PortAssistantSessionGateway(port),
		assistantSetupGateway: new PortAssistantSetupGateway(port),
		attachmentFilesGateway: new PrivateFolderAttachmentFilesGateway(privateFolder, folder),
		clockGateway: new SystemClockGateway(),
		attachmentFolderGateway: new NoAttachmentFolderGateway(),
		claudeOptionsGateway: new NoClaudeOptionsGateway(),
		workingFolderGateway: new NoWorkingFolderGateway(),
		fileDropGateway: new NoFileDropGateway(),
	};
}
