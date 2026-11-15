export interface WrittenFile {
	readonly path: string;
	readonly writtenAt: number;
}

export interface SentAttachments {
	readonly onDisk: readonly WrittenFile[];
}

export abstract class SentAttachmentsGateway {
	abstract sentAttachments(): SentAttachments;
	abstract saveSentAttachments(next: SentAttachments): void;
}
