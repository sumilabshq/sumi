import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import type { AttachmentsFolder } from "../../shared/host/attachments-folder.host.js";
import type { ClaudeOptionsCell } from "../../shared/host/claude-options.host.js";
import type { FileDrops } from "../../shared/host/file-drops.host.js";
import type { FolderLending } from "../../shared/host/folder-lending.host.js";
import type { WorkspaceFolders } from "../../shared/host/workspace-folders.host.js";
import type { AssistantSessionGateway } from "../assistant-session/assistant-session.gateway.js";
import type { AssistantSetupGateway } from "../assistant-setup/assistant-setup.gateway.js";
import type { AttachmentFilesGateway } from "../attachment-files/attachment-files.gateway.js";
import type { AttachmentFolderGateway } from "../attachment-folder/attachment-folder.gateway.js";
import type { ClaudeOptionsGateway } from "../claude-options/claude-options.gateway.js";
import type { ClockGateway } from "../clock/clock.gateway.js";
import type { ComposerPrefillGateway } from "../composer-prefill/composer-prefill.gateway.js";
import type { DraftAttachmentsGateway } from "../draft-attachments/draft-attachments.gateway.js";
import type { FileDragGateway } from "../file-drag/file-drag.gateway.js";
import type { FileDropGateway } from "../file-drop/file-drop.gateway.js";
import type { SentAttachmentsGateway } from "../sent-attachments/sent-attachments.gateway.js";
import type { StarterGateway } from "../starter/starter.gateway.js";
import type { WorkingFoldersGateway } from "../working-folders/working-folders.gateway.js";
import { obsidianAssistantParts } from "./obsidian.gateway.js";
import { tauriAssistantParts } from "./tauri.gateway.js";
import { webAssistantParts } from "./web.gateway.js";

export type AssistantParts = {
	readonly assistantSession: AssistantSessionGateway;
	readonly assistantSetup: AssistantSetupGateway;
	readonly attachmentFiles: AttachmentFilesGateway;
	readonly attachmentFolder: AttachmentFolderGateway;
	readonly claudeOptions: ClaudeOptionsGateway;
	readonly workingFolders: WorkingFoldersGateway;
	readonly fileDrop: FileDropGateway;
	readonly clock: ClockGateway;
	readonly draftAttachments: DraftAttachmentsGateway;
	readonly sentAttachments: SentAttachmentsGateway;
	readonly composerPrefill: ComposerPrefillGateway;
	readonly starter: StarterGateway;
	readonly fileDrag: FileDragGateway;
};

export interface WebHosts {
	readonly kind: "web";
	readonly webAssistant: AssistantPort;
}

export interface ObsidianHosts {
	readonly kind: "obsidian";
	readonly obsidianAssistant: AssistantPort;
	readonly attachments: AttachmentsFolder;
}

export interface TauriHosts {
	readonly kind: "tauri";
	readonly tauriAssistant: AssistantPort;
	readonly tauriAttachments: AttachmentsFolder;
	readonly folders: FolderLending;
	readonly claudeOptions: ClaudeOptionsCell;
	readonly drops: FileDrops;
	readonly workspace: WorkspaceFolders;
}

export type AssistantHosts = WebHosts | ObsidianHosts | TauriHosts;

export function assistantPartsOn({ host }: { readonly host: AssistantHosts }): AssistantParts {
	if (host.kind === "tauri") {
		return tauriAssistantParts(host);
	}

	if (host.kind === "obsidian") {
		return obsidianAssistantParts(host);
	}

	return webAssistantParts(host);
}
