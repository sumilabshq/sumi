import type { AttachmentFilesGateway } from "../../../gateways/attachment-files/attachment-files.gateway.js";
import type { TrailerEntry } from "../../../shared/lib/attachment-trailer.js";
import type { DraftAttachment } from "../../../shared/lib/draft-attachments-store.js";
import type { SentAttachments } from "../../../shared/lib/sent-attachments-store.js";
import { sizeSaid } from "../../../shared/lib/size-said.js";
import type { ProviderReads } from "../../../shared/schema/agent-setup.schema.js";
import { textOf } from "./read-attachment.js";

export interface WrittenAttachment {
	readonly path: string;
	readonly preview: string | null;
}

export interface WrittenAttachments {
	readonly entries: readonly TrailerEntry[];
	readonly files: readonly WrittenAttachment[];
}

export function writtenOf(
	drafts: readonly DraftAttachment[],
	reads: ProviderReads,
	attachmentFilesGateway: AttachmentFilesGateway,
): WrittenAttachments {
	const files: WrittenAttachment[] = [];
	const entries = drafts.map((draft): TrailerEntry => {
		const said = {
			kind: draft.kind,
			name: draft.name,
			size: sizeSaid(draft.bytes.length),
		};

		if (reads.files === "inline") {
			return {
				...said,
				path: null,
				text: textOf(draft.bytes),
			};
		}

		const path = attachmentFilesGateway.write(draft.name, draft.bytes);
		files.push({
			path,
			preview: draft.preview,
		});
		return {
			...said,
			path,
			text: null,
		};
	});
	return {
		entries,
		files,
	};
}

export function sentRecordOf(sent: SentAttachments, written: WrittenAttachments, now: number): SentAttachments {
	const previews = new Map(sent.previews);

	for (const { path, preview } of written.files) {
		if (preview !== null) {
			previews.set(path, preview);
		}
	}

	return {
		onDisk: [...sent.onDisk, ...written.files.map(({ path }) => ({ path, writtenAt: now }))],
		previews,
	};
}
