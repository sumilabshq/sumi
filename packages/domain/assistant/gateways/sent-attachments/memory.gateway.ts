import { SentAttachmentsGateway } from "./sent-attachments.gateway.js";
import type { SentAttachments } from "./sent-attachments.gateway.js";

const NOTHING_SENT: SentAttachments = {
	onDisk: [],
	previews: new Map(),
};

export class MemorySentAttachmentsGateway extends SentAttachmentsGateway {
	private sent: SentAttachments = NOTHING_SENT;

	sentAttachments(): SentAttachments {
		return this.sent;
	}

	saveSentAttachments(next: SentAttachments): void {
		this.sent = next;
	}
}
