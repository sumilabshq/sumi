import type { App, WorkspaceLeaf } from "obsidian";
import { lookPathOf, lookToWrite, readLook, withOptionPicked } from "@widgetarium/core/app-look.js";
import type { Look } from "@widgetarium/core/app-look.js";
import type { Parsed } from "@widgetarium/core/json-text.js";
import { movedNode } from "@widgetarium/core/engine/node-moves.js";
import type { WidgetRegistry } from "@widgetarium/core/registry.js";
import type { LayerMove } from "../../schema/layer-move.js";
import { addPhotos } from "./photo-files.js";
import { noteToReturnTo, readAppSpec } from "../../requests/pages/note-to-return-to.js";

export interface DesignPlace {
	readonly leafOf: () => WorkspaceLeaf;
	readonly fromNote: () => string;
}

const PHOTOS_FAILED = "The photos were not added to the canvas: {why}";
const NO_PAGE_FOLDER = "{widget} has no folder in this vault, so its layout cannot be changed here.";
const NOT_MOVED = "Nothing was moved: {why}";
const NO_NOTE_TO_RETURN_TO = "{app} has no page with a note to go back to.";
const SPEC_REFUSED = "The spec of {app} cannot be read: {why}";
const NO_LOOK = "{app} has no look to change yet: the assistant offers it first.";
const NOT_PICKED = "The look was not changed: {why}";

export async function readAppLook(obsidian: App, app: string): Promise<Parsed<Look> | null> {
	const text = await obsidian.vault.adapter.read(lookPathOf(app)).catch(() => null);
	if (text === null) return null;
	const read = readLook(text);
	if (read.refusal !== undefined) console.error("[widgetarium] the look of the app cannot be read", app, read.refusal);
	return read;
}

export async function pickLookOption(obsidian: App, app: string, settingName: string, option: string): Promise<void> {
	const was = await readAppLook(obsidian, app);
	if (!was) return refused(NO_LOOK.replace("{app}", app), "the look was not picked", app);
	if (was.refusal !== undefined)
		return refused(NOT_PICKED.replace("{why}", was.refusal), "the look was not picked", app);
	const picked = withOptionPicked(was.value, settingName, option);
	if (picked.refusal !== undefined)
		return refused(NOT_PICKED.replace("{why}", picked.refusal), "the look was not picked", app, settingName, option);
	// TRADE-OFF: read then write across two processes; an agent write between them loses this pick, a lock costs more.
	await obsidian.vault.adapter.write(lookPathOf(app), lookToWrite(picked.value));
}

export async function photosAdded(obsidian: App, app: string, photos: readonly File[]): Promise<void> {
	try {
		await addPhotos(obsidian.vault.adapter, app, photos);
	} catch (failure) {
		const why = failure instanceof Error ? failure.message : String(failure);
		refused(PHOTOS_FAILED.replace("{why}", why), "design photos were not added", app, failure);
	}
}

export async function layerMoved(
	obsidian: App,
	registry: WidgetRegistry,
	widget: string,
	move: LayerMove,
): Promise<void> {
	const folder = registry.get(widget)?.folder;
	if (!folder) return refused(NO_PAGE_FOLDER.replace("{widget}", widget), "the layer was not moved", widget, move);
	const path = `${folder}/${move.file}`;
	const adapter = obsidian.vault.adapter;
	const moved = movedNode(await adapter.read(path), move);
	if ("refusal" in moved)
		return refused(NOT_MOVED.replace("{why}", moved.refusal), "the layer was not moved", path, move);
	await adapter.write(path, moved.source);
}

export async function returnedToAppNote(obsidian: App, place: DesignPlace, app: string, page: string): Promise<void> {
	const read = await readAppSpec(obsidian.vault.adapter, app);
	if (read?.refusal !== undefined)
		return refused(SPEC_REFUSED.replace("{app}", app).replace("{why}", read.refusal), "the canvas cannot return", app);
	const note = noteToReturnTo(read?.spec.pages ?? [], page, place.fromNote());
	const file = note ? obsidian.vault.getFileByPath(note) : null;
	if (!file) return refused(NO_NOTE_TO_RETURN_TO.replace("{app}", app), "the canvas cannot return", app, page, note);
	await place.leafOf().openFile(file, { active: true });
}

function refused(reason: string, what: string, ...context: readonly unknown[]): never {
	console.error(`[widgetarium] ${what}`, ...context, reason);
	throw new Error(reason);
}
