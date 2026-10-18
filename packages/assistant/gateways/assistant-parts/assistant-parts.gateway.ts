import { MemoryComposerPrefillStore } from "../../shared/lib/composer-prefill-store.js";
import type { ComposerPrefillStore } from "../../shared/lib/composer-prefill-store.js";
import { MemoryDraftAttachmentsStore } from "../../shared/lib/draft-attachments-store.js";
import type { DraftAttachmentsStore } from "../../shared/lib/draft-attachments-store.js";
import { MemorySentAttachmentsStore } from "../../shared/lib/sent-attachments-store.js";
import type { SentAttachmentsStore } from "../../shared/lib/sent-attachments-store.js";
import type { AssistantSessionGateway } from "../assistant-session/assistant-session.gateway.js";
import type { AssistantSetupGateway } from "../assistant-setup/assistant-setup.gateway.js";
import type { AttachmentFilesGateway } from "../attachment-files/attachment-files.gateway.js";
import type { ClockGateway } from "../clock/clock.gateway.js";

export interface AssistantGateways {
	readonly assistantSessionGateway: AssistantSessionGateway;
	readonly assistantSetupGateway: AssistantSetupGateway;
	readonly attachmentFilesGateway: AttachmentFilesGateway;
	readonly clockGateway: ClockGateway;
}

export interface AssistantParts extends AssistantGateways {
	readonly draftAttachmentsStore: DraftAttachmentsStore;
	readonly sentAttachmentsStore: SentAttachmentsStore;
	readonly composerPrefillStore: ComposerPrefillStore;
}

export function assistantPartsOf(gateways: AssistantGateways): AssistantParts {
	return {
		...gateways,
		draftAttachmentsStore: new MemoryDraftAttachmentsStore(),
		sentAttachmentsStore: new MemorySentAttachmentsStore(),
		composerPrefillStore: new MemoryComposerPrefillStore(),
	};
}
