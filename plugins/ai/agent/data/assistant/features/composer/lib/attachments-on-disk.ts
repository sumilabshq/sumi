import type { SentPictures } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantSessionGateway } from "../../../gateways/assistant-session/assistant-session.gateway.js";
import type { AttachmentFilesGateway } from "../../../gateways/attachment-files/attachment-files.gateway.js";
import type { ClockGateway } from "../../../gateways/clock/clock.gateway.js";
import type { DraftAttachment } from "../../../gateways/draft-attachments/draft-attachments.gateway.js";
import type { PicturePreviewsGateway } from "../../../gateways/picture-previews/picture-previews.gateway.js";
import type { SentAttachmentsGateway } from "../../../gateways/sent-attachments/sent-attachments.gateway.js";
import type { TrailerEntry } from "../../../shared/lib/attachment-trailer.js";
import type { ProviderReads } from "../../../shared/schema/agent-setup.schema.js";
import { LARGEST_PICTURE_EDGE_PX } from "./attachment-rules.js";
import { KEPT_AT_MOST_MS, sweptPaths, withoutSwept } from "./attachment-sweep.js";
import type { SweepMoment } from "./attachment-sweep.js";
import { isWrittenToDisk, pathsOf, picturesOf, sentRecordOf, trailerEntryOf } from "./written.js";
import type { WrittenAttachment } from "./written.js";

export const SENT = "sent with the message";

const KEPT_AN_HOUR = "kept an hour";
const TURN_ENDED = "the turn ended";

interface WrittenDrafts {
	readonly entries: readonly TrailerEntry[];
	readonly files: readonly WrittenAttachment[];
}

export type Delivery = (said: string, pictures: SentPictures) => Promise<void>;

export interface SweptFolder {
	readonly attachmentFiles: AttachmentFilesGateway;
	readonly sentAttachments: SentAttachmentsGateway;
}

export interface SendingParts {
	readonly assistantSession: AssistantSessionGateway;
	readonly attachmentFiles: AttachmentFilesGateway;
	readonly sentAttachments: SentAttachmentsGateway;
	readonly picturePreviews: PicturePreviewsGateway;
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
	injects: SendingParts,
	{ said, files }: { readonly said: string; readonly files: readonly WrittenAttachment[] },
	deliver: Delivery,
): Promise<void> {
	try {
		await deliver(said, await picturesWithinEdge(injects.picturePreviews, picturesOf(files)));
	} catch (failed: unknown) {
		files.forEach(({ path }) => injects.attachmentFiles.removeAttachment(path));
		throw failed;
	}
}

export function recordSent(injects: SendingParts, files: readonly WrittenAttachment[]): void {
	const was = injects.sentAttachments.sentAttachments();
	const next = sentRecordOf(was, files, injects.clock.now());
	injects.sentAttachments.saveSentAttachments(next);
	console.debug(`[widgetarium] attachments on disk ${pathsOf(was)} → ${pathsOf(next)} (${SENT})`);
}

export function sweepFolder({ attachmentFiles, sentAttachments }: SweptFolder, moment: SweepMoment): void {
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
}

async function picturesWithinEdge(picturePreviews: PicturePreviewsGateway, whole: SentPictures): Promise<SentPictures> {
	const within = await Promise.all(
		Object.entries(whole).map(
			async ([path, preview]) => [path, await previewWithinEdgeOrWhole(picturePreviews, preview)] as const,
		),
	);
	return Object.fromEntries(within);
}

async function previewWithinEdgeOrWhole(picturePreviews: PicturePreviewsGateway, whole: string): Promise<string> {
	try {
		const within = await picturePreviews.previewWithin(whole, LARGEST_PICTURE_EDGE_PX);
		console.debug(
			`[widgetarium] sent picture ${whole.length} → ${within.length} chars (within ${LARGEST_PICTURE_EDGE_PX} px)`,
		);
		return within.length < whole.length ? within : whole;
	} catch (failed: unknown) {
		console.error(`[widgetarium] sent picture ${whole.length} chars kept whole: it could not be made smaller`, failed);
		return whole;
	}
}
