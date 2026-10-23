import type { AttachmentKind } from "../schema/attachment.schema.js";

export interface DraftAttachment {
	readonly id: string;
	readonly name: string;
	readonly kind: AttachmentKind;
	readonly mime: string;
	readonly bytes: Uint8Array;
	readonly preview: string | null;
	readonly path: string | null;
}

export abstract class DraftAttachmentsStore {
	abstract now(): readonly DraftAttachment[];
	abstract watch(changed: () => void): () => void;
	abstract change(next: readonly DraftAttachment[], reason: string): void;
}

export class MemoryDraftAttachmentsStore extends DraftAttachmentsStore {
	private readonly watchers = new Set<() => void>();
	private drafts: readonly DraftAttachment[] = [];

	override now(): readonly DraftAttachment[] {
		return this.drafts;
	}

	override watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	override change(next: readonly DraftAttachment[], reason: string): void {
		if (isSameDrafts(this.drafts, next)) {
			return;
		}

		const was = namesOf(this.drafts);
		this.drafts = next;
		console.debug(`[widgetarium] draft attachments ${was} → ${namesOf(next)} (${reason})`);
		for (const changed of [...this.watchers]) {
			changed();
		}
	}
}

function isSameDrafts(was: readonly DraftAttachment[], became: readonly DraftAttachment[]): boolean {
	return was.length === became.length && was.every((draft, at) => draft === became[at]);
}

function namesOf(drafts: readonly DraftAttachment[]): string {
	return JSON.stringify(drafts.map(({ name }) => name));
}
