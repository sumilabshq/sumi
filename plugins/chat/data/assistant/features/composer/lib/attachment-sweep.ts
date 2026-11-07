import type { SentAttachments } from "../../../gateways/sent-attachments/sent-attachments.gateway.js";

export interface SweepMoment {
	readonly isBusy: boolean;
	readonly now: number;
}

export const KEPT_AT_MOST_MS = 3600000;

export function sweptPaths(sent: SentAttachments, { isBusy, now }: SweepMoment): ReadonlySet<string> {
	return new Set(
		sent.onDisk.filter((file) => !isBusy || now - file.writtenAt >= KEPT_AT_MOST_MS).map(({ path }) => path),
	);
}

export function withoutSwept(sent: SentAttachments, swept: ReadonlySet<string>): SentAttachments {
	return {
		onDisk: sent.onDisk.filter(({ path }) => !swept.has(path)),
		previews: sent.previews,
	};
}
