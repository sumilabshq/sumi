export interface WrittenFile {
	readonly path: string;
	readonly writtenAt: number;
}

export interface SentAttachments {
	readonly onDisk: readonly WrittenFile[];
	readonly previews: ReadonlyMap<string, string>;
}

const NOTHING_SENT: SentAttachments = {
	onDisk: [],
	previews: new Map(),
};

export abstract class SentAttachmentsStore {
	abstract now(): SentAttachments;
	abstract watch(changed: () => void): () => void;
	abstract change(next: SentAttachments, reason: string): void;
}

export class MemorySentAttachmentsStore extends SentAttachmentsStore {
	private readonly watchers = new Set<() => void>();
	private sent: SentAttachments = NOTHING_SENT;

	override now(): SentAttachments {
		return this.sent;
	}

	override watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	override change(next: SentAttachments, reason: string): void {
		if (next.onDisk === this.sent.onDisk && next.previews === this.sent.previews) {
			return;
		}

		const was = pathsOf(this.sent);
		this.sent = next;
		console.debug(`[widgetarium] attachments on disk ${was} → ${pathsOf(next)} (${reason})`);
		for (const changed of [...this.watchers]) {
			changed();
		}
	}
}

function pathsOf({ onDisk }: SentAttachments): string {
	return JSON.stringify(onDisk.map(({ path }) => path));
}
