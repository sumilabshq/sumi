import {
	REFERENCES_FOLDER,
	designFolderOf,
	designPathOf,
	referenceFileOf,
	referencePathOf,
	withReferencesAdded,
} from "@widgetarium/core/app-design.js";
import { reasonOf } from "@widgetarium/core/requests";
import type { DesignFiles } from "../../../adapters/design-files/design-files.adapter.js";
import type { DesignReads } from "../../../shared/lib/design/design-reads.js";
import type { CanvasStore } from "../../../shared/lib/view/canvas-store.js";
import type { PhotoQueue } from "./photo-queue.js";

interface PhotoAdding {
	readonly designReads: DesignReads;
	readonly designFiles: DesignFiles;
	readonly canvasStore: CanvasStore;
	readonly photoQueue: PhotoQueue;
}

const PHOTOS_FAILED = "The photos were not added to the canvas: {why}";
const PASTED_NAME = "pasted-{at}.png";

export async function addPhotos(adding: PhotoAdding, photos: readonly File[]): Promise<void> {
	const { app } = adding.canvasStore.now();
	try {
		await adding.photoQueue.after(app, () => photosWritten(adding.designFiles, app, photos));
	} catch (failure) {
		throw new Error(PHOTOS_FAILED.replace("{why}", reasonOf(failure)));
	}
	adding.designReads.changed(app);
}

// TODO: write the files and the references as one step, and find photo files no reference names
async function photosWritten(designFiles: DesignFiles, app: string, photos: readonly File[]): Promise<void> {
	if (photos.length === 0) return;
	const folder = `${designFolderOf(app)}/${REFERENCES_FOLDER}`;
	if (!(await designFiles.exists(folder))) await designFiles.makeFolder(folder);
	const files = photoFilesOf(photos, Date.now().toString(36));
	await Promise.all(
		photos.map(async (photo, at) =>
			designFiles.writeBinary(referencePathOf(app, files[at] ?? ""), await photo.arrayBuffer()),
		),
	);
	await referencesWritten(designFiles, app, files);
}

async function referencesWritten(designFiles: DesignFiles, app: string, files: readonly string[]): Promise<void> {
	const added = files.map((file) => ({ file }));
	const design = designPathOf(app);
	if (await designFiles.exists(design))
		return designFiles.changeText(design, (text) => withReferencesAdded(text, added));
	await designFiles.writeText(design, withReferencesAdded(null, added));
}

function photoFilesOf(photos: readonly File[], stamp: string): string[] {
	return photos.map((photo, at) =>
		referenceFileOf(photo.name || PASTED_NAME.replace("{at}", String(at)), `${stamp}${at}`),
	);
}
