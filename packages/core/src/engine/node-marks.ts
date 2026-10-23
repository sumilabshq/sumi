import { contentHash } from "./content-hash.js";

export const NODE_MARK = "data-wg-node";
export const WIDGET_MARK = "data-wg-widget";
export const HELD_MARK = "data-wg-held";
export const SCOPE_MARK = "data-wg-scope";
export const SLOT_ENTRY_MARK = "data-wg-slot-entry";

const PAGE_FOLDER = /-page$/;
const MARK_SHAPE = /^(.+)#(\d+):(\d+)$/;

export interface NodeMark {
	readonly file: string;
	readonly sourceKey: string;
	readonly start: number;
}

export function isPageFolder(folder: string): boolean {
	return PAGE_FOLDER.test(folder);
}

export function nodeMarkOf(file: string, sourceKey: string, start: number): string {
	return `${file}#${sourceKey}:${start}`;
}

export function readNodeMark(mark: string): NodeMark | null {
	const [, file, sourceKey, start] = MARK_SHAPE.exec(mark) ?? [];
	if (!file || !sourceKey || !start) return null;
	return { file, sourceKey, start: Number(start) };
}

export function sourceKeyOf(source: string): string {
	return contentHash(source);
}
