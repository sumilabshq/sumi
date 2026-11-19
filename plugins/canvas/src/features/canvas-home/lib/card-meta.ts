import type { CanvasRow } from "@sumi/artboards/contract";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function cardMetaOf(row: CanvasRow, now: number): string {
	const counts = `${countOf(row.pageCount, "page")} · ${countOf(row.boardCount, "board")}`;
	return row.editedAt === 0 ? counts : `${counts} · ${editedAgoOf(now - row.editedAt)}`;
}

function countOf(count: number, noun: string): string {
	return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function editedAgoOf(ms: number): string {
	if (ms < MINUTE_MS) {
		return "just now";
	}

	if (ms < HOUR_MS) {
		return `${Math.floor(ms / MINUTE_MS)} min ago`;
	}

	if (ms < DAY_MS) {
		return `${Math.floor(ms / HOUR_MS)} h ago`;
	}

	if (ms < 2 * DAY_MS) {
		return "yesterday";
	}

	return `${Math.floor(ms / DAY_MS)} d ago`;
}
