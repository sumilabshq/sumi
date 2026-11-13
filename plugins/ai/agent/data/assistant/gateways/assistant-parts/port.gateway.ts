import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import type { AttachmentsFolder } from "../../shared/host/attachments-folder.host.js";
import { PortAssistantSessionGateway } from "../assistant-session/port.gateway.js";
import { PortAssistantSetupGateway } from "../assistant-setup/port.gateway.js";
import type { AttachmentFilesGateway } from "../attachment-files/attachment-files.gateway.js";
import { NoAttachmentFilesGateway } from "../attachment-files/none.gateway.js";
import { PrivateFolderAttachmentFilesGateway } from "../attachment-files/private-folder.gateway.js";
import { NoAttachmentFolderGateway } from "../attachment-folder/none.gateway.js";
import { PortChatDraftsGateway } from "../chat-drafts/port.gateway.js";
import { NoClaudeOptionsGateway } from "../claude-options/none.gateway.js";
import { SystemClockGateway } from "../clock/system.gateway.js";
import { MemoryComposerPrefillGateway } from "../composer-prefill/memory.gateway.js";
import { MemoryDraftAttachmentsGateway } from "../draft-attachments/memory.gateway.js";
import { MemoryFileDragGateway } from "../file-drag/memory.gateway.js";
import { NoFileDropGateway } from "../file-drop/none.gateway.js";
import { MemorySentAttachmentsGateway } from "../sent-attachments/memory.gateway.js";
import { NoWorkingFoldersGateway } from "../working-folders/none.gateway.js";
import type { AssistantParts } from "./assistant-parts.gateway.js";

export function portAssistantParts(port: AssistantPort, attachmentFiles: AttachmentFilesGateway): AssistantParts {
	return {
		assistantSession: new PortAssistantSessionGateway(port),
		assistantSetup: new PortAssistantSetupGateway(port),
		attachmentFiles,
		attachmentFolder: new NoAttachmentFolderGateway(),
		claudeOptions: new NoClaudeOptionsGateway(),
		workingFolders: new NoWorkingFoldersGateway(),
		fileDrop: new NoFileDropGateway(),
		clock: new SystemClockGateway(),
		draftAttachments: new MemoryDraftAttachmentsGateway(),
		sentAttachments: new MemorySentAttachmentsGateway(),
		composerPrefill: new MemoryComposerPrefillGateway(),
		chatDrafts: new PortChatDraftsGateway(port),
		fileDrag: new MemoryFileDragGateway(),
	};
}

export function attachmentFilesIn({ folder, files }: AttachmentsFolder): AttachmentFilesGateway {
	if (folder === null) {
		return new NoAttachmentFilesGateway();
	}

	return new PrivateFolderAttachmentFilesGateway(files, folder);
}
