export interface WrittenFile {
	readonly path: string;
	readonly writtenAt: number;
}

export interface SentAttachments {
	readonly onDisk: readonly WrittenFile[];
	readonly previews: ReadonlyMap<string, string>;
}

export abstract class SentAttachmentsGateway {
	abstract sentAttachments(): SentAttachments;
	abstract saveSentAttachments(next: SentAttachments): void;
}
