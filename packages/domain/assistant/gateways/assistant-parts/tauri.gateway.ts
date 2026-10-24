import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { PortAssistantSessionGateway } from "../assistant-session/port.gateway.js";
import { PortAssistantSetupGateway } from "../assistant-setup/port.gateway.js";
import { PrivateFolderAttachmentFilesGateway } from "../attachment-files/private-folder.gateway.js";
import type { PrivateFolder } from "../attachment-files/private-folder.gateway.js";
import { WebAttachmentFilesGateway } from "../attachment-files/web.gateway.js";
import type { AttachmentFilesGateway } from "../attachment-files/attachment-files.gateway.js";
import { PickerAttachmentFolderGateway } from "../attachment-folder/picker.gateway.js";
import type { FolderPicker } from "../attachment-folder/picker.gateway.js";
import { HeldClaudeOptionsGateway } from "../claude-options/held.gateway.js";
import type { ClaudeOptionsHeld } from "../claude-options/held.gateway.js";
import { SystemClockGateway } from "../clock/system.gateway.js";
import type { FileDropGateway } from "../file-drop/file-drop.gateway.js";
import type { WorkingFolderGateway } from "../working-folder/working-folder.gateway.js";
import type { AssistantGateways } from "./assistant-parts.gateway.js";

export interface TauriAttachments {
	readonly privateFolder: PrivateFolder;
	readonly folder: string;
}

export interface TauriAssistantHold {
	readonly port: AssistantPort;
	readonly attachments: TauriAttachments | null;
	readonly folderPicker: FolderPicker;
	readonly claudeOptions: ClaudeOptionsHeld;
	readonly workingFolderGateway: WorkingFolderGateway;
	readonly fileDropGateway: FileDropGateway;
}

export function tauriAssistantGateways(hold: TauriAssistantHold): AssistantGateways {
	return {
		assistantSessionGateway: new PortAssistantSessionGateway(hold.port),
		assistantSetupGateway: new PortAssistantSetupGateway(hold.port),
		attachmentFilesGateway: attachmentFilesOf(hold.attachments),
		clockGateway: new SystemClockGateway(),
		attachmentFolderGateway: new PickerAttachmentFolderGateway(hold.folderPicker),
		claudeOptionsGateway: new HeldClaudeOptionsGateway(hold.claudeOptions),
		workingFolderGateway: hold.workingFolderGateway,
		fileDropGateway: hold.fileDropGateway,
	};
}

function attachmentFilesOf(attachments: TauriAttachments | null): AttachmentFilesGateway {
	if (attachments === null) {
		return new WebAttachmentFilesGateway();
	}

	return new PrivateFolderAttachmentFilesGateway(attachments.privateFolder, attachments.folder);
}
