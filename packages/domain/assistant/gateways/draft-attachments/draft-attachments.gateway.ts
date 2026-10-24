import type { AttachmentKind } from "../../shared/schema/attachment.schema.js";

export interface DraftAttachment {
	readonly id: string;
	readonly name: string;
	readonly kind: AttachmentKind;
	readonly mime: string;
	readonly bytes: Uint8Array;
	readonly preview: string | null;
	readonly path: string | null;
}

export abstract class DraftAttachmentsGateway {
	abstract draftAttachments(): readonly DraftAttachment[];
	abstract saveDraftAttachments(next: readonly DraftAttachment[]): void;
}
