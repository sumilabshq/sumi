import { Notice, TFile } from "obsidian";
import type { App, WorkspaceLeaf } from "obsidian";
import { lookPathOf, lookToWrite, readLook, withOptionPicked } from "@widgetarium/core/app-look.js";
import type { Look } from "@widgetarium/core/app-look.js";
import type { Parsed } from "@widgetarium/core/json-text.js";
import { movedNode } from "@widgetarium/core/engine/node-moves.js";
import type { WidgetRegistry } from "@widgetarium/core/registry.js";
import type { LayerMove } from "../../../schemas/layer-move.schema.js";
import { addPhotos } from "../../photos/photo-files.js";
import { noteToReturnTo, readAppSpec } from "./app-spec-read.js";

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
	if (!was) return refusePick(NO_LOOK.replace("{app}", app));
	if (was.refusal !== undefined) return refusePick(was.refusal);
	const picked = withOptionPicked(was.value, settingName, option);
	if (picked.refusal !== undefined) return refusePick(picked.refusal);
	// TRADE-OFF: read then write across two processes; an agent write between them loses this pick, a lock costs more.
	await obsidian.vault.adapter.write(lookPathOf(app), lookToWrite(picked.value));
}

export async function photosAdded(obsidian: App, app: string, photos: readonly File[]): Promise<void> {
	try {
		await addPhotos(obsidian.vault.adapter, app, photos);
	} catch (failure) {
		console.error("[widgetarium] design photos were not added", failure);
		new Notice(PHOTOS_FAILED.replace("{why}", failure instanceof Error ? failure.message : String(failure)));
	}
}

export async function layerMoved(
	obsidian: App,
	registry: WidgetRegistry,
	widget: string,
	move: LayerMove,
): Promise<void> {
	const folder = registry.get(widget)?.folder;
	if (!folder) return void new Notice(NO_PAGE_FOLDER.replace("{widget}", widget));
	const path = `${folder}/${move.file}`;
	const adapter = obsidian.vault.adapter;
	const moved = movedNode(await adapter.read(path), move);
	if ("refusal" in moved) return void new Notice(NOT_MOVED.replace("{why}", moved.refusal));
	await adapter.write(path, moved.source);
}

export async function returnedToAppNote(obsidian: App, place: DesignPlace, app: string, page: string): Promise<void> {
	const read = await readAppSpec(obsidian.vault.adapter, app);
	if (read?.refusal !== undefined) {
		console.error("[widgetarium] the canvas cannot return to the app", read.refusal);
		return void new Notice(SPEC_REFUSED.replace("{app}", app).replace("{why}", read.refusal));
	}
	const note = noteToReturnTo(read?.spec.pages ?? [], page, place.fromNote());
	const file = note && obsidian.vault.getAbstractFileByPath(note);
	if (!(file instanceof TFile)) return void new Notice(NO_NOTE_TO_RETURN_TO.replace("{app}", app));
	await place.leafOf().openFile(file, { active: true });
}

function refusePick(refusal: string): never {
	new Notice(NOT_PICKED.replace("{why}", refusal));
	throw new Error(refusal);
}
