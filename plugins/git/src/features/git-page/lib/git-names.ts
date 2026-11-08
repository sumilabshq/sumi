import type { FileStatus } from "@sumi/git";
import { LAST_COMMIT } from "./git-address.js";

const SEPARATOR = "/";
const LAST_COMMIT_LABEL = "last commit";
const STATUS_LETTERS: Readonly<Record<FileStatus, string>> = {
	added: "A",
	modified: "M",
	deleted: "D",
	renamed: "R",
};
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = "now";
const ONE_FILE = "1 file";
const FILE_COUNT = "{count} files";
const AGES: readonly (readonly [number, string])[] = [
	[DAY, "{n}d"],
	[HOUR, "{n}h"],
	[MINUTE, "{n}m"],
];

export function fileNameOf(path: string): string {
	return path.slice(path.lastIndexOf(SEPARATOR) + 1);
}

export function fileFolderOf(path: string): string {
	return path.slice(0, path.lastIndexOf(SEPARATOR) + 1);
}

export function statusLetterOf(status: FileStatus): string {
	return STATUS_LETTERS[status];
}

export function baseLabelOf(base: string): string {
	return base === LAST_COMMIT ? LAST_COMMIT_LABEL : base;
}

export function ageOf(atSeconds: number, nowMs: number): string {
	const seconds = Math.max(0, Math.floor(nowMs / 1000) - atSeconds);
	const step = AGES.find(([size]) => seconds >= size);
	return step === undefined ? NOW : step[1].replace("{n}", String(Math.floor(seconds / step[0])));
}

export function fileCountOf(count: number): string {
	return count === 1 ? ONE_FILE : FILE_COUNT.replace("{count}", String(count));
}

export function anchorOf(path: string): string {
	return `wg-git-file-${encodeURIComponent(path)}`;
}
