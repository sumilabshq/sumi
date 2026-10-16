import { boardIn, boardOrRefused } from "./board-in-note.js";
import { textAt, textOrRefused } from "./text-at.js";
import type { ReadingAdapter } from "./text-at.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { readSpec, specPathOf } from "@widgetarium/core/app-spec.js";
import { LOCK_PATH } from "@widgetarium/core/paths.js";

const LOCK_REFUSED = "{path} cannot be read: {why}";

export async function specWidgetsOf(adapter: ReadingAdapter, app: string): Promise<string[]> {
	const text = textOrRefused(await textAt(adapter, specPathOf(app)));
	const read = text === null ? null : readSpec(text);
	if (!read?.spec) return [];
	const named = read.spec.features.flatMap((feature) => (feature.widget ? [feature.widget] : []));
	const pageNotes = read.spec.pages.flatMap((page) => (page.note ? [page.note] : []));
	const onPages = await Promise.all(pageNotes.map((note) => widgetsOnNote(adapter, note)));
	return [...named, ...onPages.flat()];
}

export async function catalogueInstallsOf(adapter: ReadingAdapter): Promise<string[]> {
	const text = textOrRefused(await textAt(adapter, LOCK_PATH));
	if (text === null) return [];
	const lock = lockIn(text);
	return isObject(lock) && isObject(lock["widgets"]) ? Object.keys(lock["widgets"]) : [];
}

async function widgetsOnNote(adapter: ReadingAdapter, note: string): Promise<string[]> {
	const text = textOrRefused(await textAt(adapter, note));
	if (text === null) return [];
	return boardOrRefused(boardIn(text), note)?.tiles.map((tile) => tile.widget) ?? [];
}

function lockIn(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch (failure) {
		const why = failure instanceof Error ? failure.message : String(failure);
		throw new Error(LOCK_REFUSED.replace("{path}", LOCK_PATH).replace("{why}", why));
	}
}
