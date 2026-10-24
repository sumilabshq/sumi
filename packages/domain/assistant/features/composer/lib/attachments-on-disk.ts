import type { Emitter } from "@widgetarium/core/requests";
import type { AssistantSessionGateway } from "../../../gateways/assistant-session/assistant-session.gateway.js";
import type { AttachmentFilesGateway } from "../../../gateways/attachment-files/attachment-files.gateway.js";
import type { ClockGateway } from "../../../gateways/clock/clock.gateway.js";
import type { DraftAttachment } from "../../../gateways/draft-attachments/draft-attachments.gateway.js";
import type { SentAttachmentsGateway } from "../../../gateways/sent-attachments/sent-attachments.gateway.js";
import { SentAttachmentsChangedEvent } from "../../../shared/events/sent-attachments.events.js";
import type { TrailerEntry } from "../../../shared/lib/attachment-trailer.js";
import type { ProviderReads } from "../../../shared/schema/agent-setup.schema.js";
import { KEPT_AT_MOST_MS, sweptPaths, withoutSwept } from "./attachment-sweep.js";
import type { SweepMoment } from "./attachment-sweep.js";
import { isWrittenToDisk, pathsOf, sentRecordOf, trailerEntryOf } from "./written.js";
import type { WrittenAttachment } from "./written.js";

export const SENT = "sent with the message";

const KEPT_AN_HOUR = "kept an hour";
const TURN_ENDED = "the turn ended";

interface WrittenDrafts {
	readonly entries: readonly TrailerEntry[];
	readonly files: readonly WrittenAttachment[];
}

export interface SweptFolder extends Emitter<typeof SentAttachmentsChangedEvent> {
	readonly attachmentFiles: AttachmentFilesGateway;
	readonly sentAttachments: SentAttachmentsGateway;
}

export interface SendingParts {
	readonly assistantSession: AssistantSessionGateway;
	readonly attachmentFiles: AttachmentFilesGateway;
	readonly sentAttachments: SentAttachmentsGateway;
	readonly clock: ClockGateway;
}

export function writeDrafts(
	drafts: readonly DraftAttachment[],
	reads: ProviderReads,
	attachmentFiles: AttachmentFilesGateway,
): WrittenDrafts {
	const files: WrittenAttachment[] = [];
	const writtenPaths = new Map<DraftAttachment, string>();

	try {
		for (const draft of drafts.filter((held) => isWrittenToDisk(held, reads))) {
			const path = attachmentFiles.saveAttachment(draft.name, draft.bytes);
			writtenPaths.set(draft, path);
			files.push({
				path,
				preview: draft.preview,
			});
		}
	} catch (failed: unknown) {
		files.forEach(({ path }) => attachmentFiles.removeAttachment(path));
		throw failed;
	}

	return {
		entries: drafts.map((draft) => trailerEntryOf(draft, writtenPaths.get(draft) ?? null)),
		files,
	};
}

export async function sendOrRemoveWritten(
	parts: SendingParts,
	said: string,
	files: readonly WrittenAttachment[],
): Promise<void> {
	try {
		await parts.assistantSession.send(said);
	} catch (failed: unknown) {
		files.forEach(({ path }) => parts.attachmentFiles.removeAttachment(path));
		throw failed;
	}
}

export function recordSent(parts: SendingParts, files: readonly WrittenAttachment[]): void {
	const was = parts.sentAttachments.sentAttachments();
	const next = sentRecordOf(was, files, parts.clock.now());
	parts.sentAttachments.saveSentAttachments(next);
	console.debug(`[widgetarium] attachments on disk ${pathsOf(was)} → ${pathsOf(next)} (${SENT})`);
}

export function sweepFolder({ attachmentFiles, sentAttachments, emit }: SweptFolder, moment: SweepMoment): void {
	const sent = sentAttachments.sentAttachments();
	const swept = sweptPaths(sent, moment);

	for (const path of swept) {
		attachmentFiles.removeAttachment(path);
	}

	attachmentFiles.removeAttachmentsOlderThan(KEPT_AT_MOST_MS, moment.now);

	if (swept.size === 0) {
		return;
	}

	const next = withoutSwept(sent, swept);
	sentAttachments.saveSentAttachments(next);
	console.debug(
		`[widgetarium] attachments on disk ${pathsOf(sent)} → ${pathsOf(next)} (${moment.isBusy ? KEPT_AN_HOUR : TURN_ENDED})`,
	);
	emit(SentAttachmentsChangedEvent);
}
