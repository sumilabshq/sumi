import type { DraftAttachment } from "../../../gateways/draft-attachments/draft-attachments.gateway.js";
import type { SentAttachments } from "../../../gateways/sent-attachments/sent-attachments.gateway.js";
import type { TrailerEntry } from "../../../shared/lib/attachment-trailer.js";
import type { ProviderReads } from "../../../shared/schema/agent-setup.schema.js";
import { FOLDER_SAID } from "./drafts.js";
import { sizeSaid } from "./size-said.js";

export interface WrittenAttachment {
	readonly path: string;
	readonly preview: string | null;
}

export function isWrittenToDisk(draft: DraftAttachment, reads: ProviderReads): boolean {
	return draft.kind !== "folder" && reads.files !== "inline";
}

export function trailerEntryOf(draft: DraftAttachment, written: string | null): TrailerEntry {
	if (draft.kind === "folder") {
		return {
			kind: draft.kind,
			name: draft.name,
			size: FOLDER_SAID,
			path: draft.path,
			text: null,
		};
	}

	return {
		kind: draft.kind,
		name: draft.name,
		size: sizeSaid(draft.bytes.length),
		path: written,
		text: written === null ? new TextDecoder().decode(draft.bytes) : null,
	};
}

export function lentFoldersOf(drafts: readonly DraftAttachment[]): string[] {
	return drafts.flatMap(({ path }) => (path === null ? [] : [path]));
}

export function sentRecordOf(
	sent: SentAttachments,
	written: readonly WrittenAttachment[],
	now: number,
): SentAttachments {
	const previews = new Map(sent.previews);

	for (const { path, preview } of written) {
		if (preview !== null) {
			previews.set(path, preview);
		}
	}

	return {
		onDisk: [...sent.onDisk, ...written.map(({ path }) => ({ path, writtenAt: now }))],
		previews,
	};
}

export function pathsOf({ onDisk }: SentAttachments): string {
	return JSON.stringify(onDisk.map(({ path }) => path));
}
