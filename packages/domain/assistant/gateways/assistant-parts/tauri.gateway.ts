import { LendingAttachmentFolderGateway } from "../attachment-folder/lending.gateway.js";
import { CellClaudeOptionsGateway } from "../claude-options/cell.gateway.js";
import { HostFileDropGateway } from "../file-drop/host.gateway.js";
import { ClientWorkingFoldersGateway } from "../working-folders/client.gateway.js";
import type { AssistantParts, TauriHosts } from "./assistant-parts.gateway.js";
import { attachmentFilesIn, portAssistantParts } from "./port.gateway.js";

export function tauriAssistantParts(host: TauriHosts): AssistantParts {
	return {
		...portAssistantParts(host.tauriAssistant, attachmentFilesIn(host.tauriAttachments)),
		attachmentFolder: new LendingAttachmentFolderGateway(host.folders),
		claudeOptions: new CellClaudeOptionsGateway(host.claudeOptions),
		workingFolders: new ClientWorkingFoldersGateway(host.workspace),
		fileDrop: new HostFileDropGateway(host.drops),
	};
}
