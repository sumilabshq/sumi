export abstract class AttachmentFilesGateway {
	abstract saveAttachment(name: string, bytes: Uint8Array): string;
	abstract removeAttachment(path: string): void;
	abstract removeAttachmentsOlderThan(ageMs: number, now: number): void;
}
