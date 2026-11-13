import type { DraftAttachment } from "../../shared/schema/attachment.schema.js";

export type { DraftAttachment };

export abstract class DraftAttachmentsGateway {
	abstract draftAttachments(): readonly DraftAttachment[];
	abstract saveDraftAttachments(next: readonly DraftAttachment[]): void;
}
