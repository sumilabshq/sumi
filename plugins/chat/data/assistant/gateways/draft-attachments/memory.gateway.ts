import { DraftAttachmentsGateway } from "./draft-attachments.gateway.js";
import type { DraftAttachment } from "./draft-attachments.gateway.js";

export class MemoryDraftAttachmentsGateway extends DraftAttachmentsGateway {
	private drafts: readonly DraftAttachment[] = [];

	draftAttachments(): readonly DraftAttachment[] {
		return this.drafts;
	}

	saveDraftAttachments(next: readonly DraftAttachment[]): void {
		this.drafts = next;
	}
}
