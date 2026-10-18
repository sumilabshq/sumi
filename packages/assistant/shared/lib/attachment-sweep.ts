import type { AttachmentFilesGateway } from "../../gateways/attachment-files/attachment-files.gateway.js";
import type { SentAttachmentsStore, WrittenFile } from "./sent-attachments-store.js";

export interface SweptFolder {
	readonly attachmentFilesGateway: AttachmentFilesGateway;
	readonly sentAttachmentsStore: SentAttachmentsStore;
}

export interface SweepMoment {
	readonly isBusy: boolean;
	readonly now: number;
}

export const KEPT_AT_MOST_MS = 3600000;

export function sweptPaths(onDisk: readonly WrittenFile[], { isBusy, now }: SweepMoment): string[] {
	return onDisk.filter((file) => !isBusy || now - file.writtenAt >= KEPT_AT_MOST_MS).map(({ path }) => path);
}

export function sweepFolder({ attachmentFilesGateway, sentAttachmentsStore }: SweptFolder, moment: SweepMoment): void {
	const sent = sentAttachmentsStore.now();
	const swept = new Set(sweptPaths(sent.onDisk, moment));

	for (const path of swept) {
		attachmentFilesGateway.remove(path);
	}

	attachmentFilesGateway.removeOlderThan(KEPT_AT_MOST_MS, moment.now);

	if (swept.size === 0) {
		return;
	}

	sentAttachmentsStore.change(
		{
			onDisk: sent.onDisk.filter(({ path }) => !swept.has(path)),
			previews: sent.previews,
		},
		moment.isBusy ? "kept an hour" : "the turn ended",
	);
}
