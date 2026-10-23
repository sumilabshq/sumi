import { MemoryComposerPrefillStore } from "../../shared/lib/composer-prefill-store.js";
import type { ComposerPrefillStore } from "../../shared/lib/composer-prefill-store.js";
import { MemoryFileDragStore } from "../../shared/lib/file-drag-store.js";
import type { FileDragStore } from "../../shared/lib/file-drag-store.js";
import { MemoryDraftAttachmentsStore } from "../../shared/lib/draft-attachments-store.js";
import type { DraftAttachmentsStore } from "../../shared/lib/draft-attachments-store.js";
import { MemorySentAttachmentsStore } from "../../shared/lib/sent-attachments-store.js";
import type { SentAttachmentsStore } from "../../shared/lib/sent-attachments-store.js";
import { MemoryStarterStore } from "../../shared/lib/starter-store.js";
import type { StarterStore } from "../../shared/lib/starter-store.js";
import type { AssistantSessionGateway } from "../assistant-session/assistant-session.gateway.js";
import type { AssistantSetupGateway } from "../assistant-setup/assistant-setup.gateway.js";
import type { AttachmentFilesGateway } from "../attachment-files/attachment-files.gateway.js";
import type { AttachmentFolderGateway } from "../attachment-folder/attachment-folder.gateway.js";
import { NoAttachmentFolderGateway } from "../attachment-folder/none.gateway.js";
import type { ClaudeOptionsGateway } from "../claude-options/claude-options.gateway.js";
import { NoClaudeOptionsGateway } from "../claude-options/none.gateway.js";
import type { ClockGateway } from "../clock/clock.gateway.js";
import type { FileDropGateway } from "../file-drop/file-drop.gateway.js";
import { NoFileDropGateway } from "../file-drop/none.gateway.js";
import { NoWorkingFolderGateway } from "../working-folder/none.gateway.js";
import type { WorkingFolderGateway } from "../working-folder/working-folder.gateway.js";

export interface LocalReach {
	readonly attachmentFolderGateway: AttachmentFolderGateway;
	readonly claudeOptionsGateway: ClaudeOptionsGateway;
	readonly workingFolderGateway: WorkingFolderGateway;
	readonly fileDropGateway: FileDropGateway;
}

export interface AssistantGateways extends Partial<LocalReach> {
	readonly assistantSessionGateway: AssistantSessionGateway;
	readonly assistantSetupGateway: AssistantSetupGateway;
	readonly attachmentFilesGateway: AttachmentFilesGateway;
	readonly clockGateway: ClockGateway;
}

export interface AssistantParts extends Required<AssistantGateways> {
	readonly draftAttachmentsStore: DraftAttachmentsStore;
	readonly sentAttachmentsStore: SentAttachmentsStore;
	readonly composerPrefillStore: ComposerPrefillStore;
	readonly starterStore: StarterStore;
	readonly fileDragStore: FileDragStore;
}

export function assistantPartsOf(gateways: AssistantGateways): AssistantParts {
	return {
		...gateways,
		attachmentFolderGateway: gateways.attachmentFolderGateway ?? new NoAttachmentFolderGateway(),
		claudeOptionsGateway: gateways.claudeOptionsGateway ?? new NoClaudeOptionsGateway(),
		workingFolderGateway: gateways.workingFolderGateway ?? new NoWorkingFolderGateway(),
		fileDropGateway: gateways.fileDropGateway ?? new NoFileDropGateway(),
		draftAttachmentsStore: new MemoryDraftAttachmentsStore(),
		sentAttachmentsStore: new MemorySentAttachmentsStore(),
		composerPrefillStore: new MemoryComposerPrefillStore(),
		starterStore: new MemoryStarterStore(),
		fileDragStore: new MemoryFileDragStore(),
	};
}
