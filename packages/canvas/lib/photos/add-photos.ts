import {
	REFERENCES_FOLDER,
	designFolderOf,
	designPathOf,
	referenceFileOf,
	referencePathOf,
	withReferencesAdded,
} from "@widgetarium/core/app-design.js";
import { reasonOf } from "@widgetarium/core/requests";
import type { DesignPhotos } from "../../adapters/design-photos/design-photos.adapter.js";
import type { DesignReads } from "../design/design-reads.js";
import type { CanvasStore } from "../view/canvas-store.js";
import type { PhotoQueue } from "./photo-queue.js";

interface PhotoAdding {
	readonly designReads: DesignReads;
	readonly designPhotos: DesignPhotos;
	readonly canvasStore: CanvasStore;
	readonly photoQueue: PhotoQueue;
}

const PHOTOS_FAILED = "The photos were not added to the canvas: {why}";
const PASTED_NAME = "pasted-{at}.png";

export async function addPhotos(adding: PhotoAdding, photos: readonly File[]): Promise<void> {
	const { app } = adding.canvasStore.now();
	try {
		await adding.photoQueue.after(app, () => photosWritten(adding.designPhotos, app, photos));
	} catch (failure) {
		throw new Error(PHOTOS_FAILED.replace("{why}", reasonOf(failure)));
	}
	adding.designReads.changed(app);
}

// TODO: write the files and the references as one step, and find photo files no reference names
async function photosWritten(designPhotos: DesignPhotos, app: string, photos: readonly File[]): Promise<void> {
	if (photos.length === 0) return;
	const folder = `${designFolderOf(app)}/${REFERENCES_FOLDER}`;
	if (!(await designPhotos.exists(folder))) await designPhotos.makeFolder(folder);
	const files = photoFilesOf(photos, Date.now().toString(36));
	await Promise.all(
		photos.map(async (photo, at) =>
			designPhotos.writePhoto(referencePathOf(app, files[at] ?? ""), await photo.arrayBuffer()),
		),
	);
	await referencesWritten(designPhotos, app, files);
}

async function referencesWritten(designPhotos: DesignPhotos, app: string, files: readonly string[]): Promise<void> {
	const added = files.map((file) => ({ file }));
	const design = designPathOf(app);
	if (await designPhotos.exists(design))
		return designPhotos.changeText(design, (text) => withReferencesAdded(text, added));
	await designPhotos.writeText(design, withReferencesAdded(null, added));
}

function photoFilesOf(photos: readonly File[], stamp: string): string[] {
	return photos.map((photo, at) =>
		referenceFileOf(photo.name || PASTED_NAME.replace("{at}", String(at)), `${stamp}${at}`),
	);
}
