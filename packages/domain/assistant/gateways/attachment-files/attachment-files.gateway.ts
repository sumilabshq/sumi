export abstract class AttachmentFilesGateway {
	abstract write(name: string, bytes: Uint8Array): string;
	abstract remove(path: string): void;
	abstract removeOlderThan(ageMs: number, now: number): void;
}
