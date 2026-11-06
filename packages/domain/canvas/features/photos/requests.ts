import { PerCall, command, reasonOf } from "@widgetarium/data-framework";
import {
	REFERENCES_FOLDER,
	designFolderOf,
	designPathOf,
	referencePathOf,
	withReferencesAdded,
} from "@widgetarium/core/app-design.js";
import { CanvasMomentGateway } from "../../gateways/canvas-moment/canvas-moment.gateway.js";
import { DesignChangedEvent } from "../../gateways/design-folder/design-folder.events.js";
import { DesignFolderGateway } from "../../gateways/design-folder/design-folder.gateway.js";
import { DesignFilesGateway } from "../../gateways/design-files/design-files.gateway.js";
import { PhotoWritesGateway } from "../../gateways/photo-writes/photo-writes.gateway.js";
import { PhotosSchema } from "../../shared/schema/photos.schema.js";
import { photoFilesOf } from "./lib/photo-files.js";

const PHOTOS_FAILED = "The photos were not added to the canvas: {why}";

export const AddPhotosCommand = command("add-photos")
	.input(PhotosSchema)
	.idempotencyKey(PerCall)
	.inject({
		canvasMoment: CanvasMomentGateway,
		designFolder: DesignFolderGateway,
		designFiles: DesignFilesGateway,
		photoWrites: PhotoWritesGateway,
	})
	.emits(DesignChangedEvent)
	.handle(async ({ photos }, { canvasMoment, designFolder, designFiles, photoWrites, emit }) => {
		const { app } = canvasMoment.moment();

		if (photos.length === 0) {
			console.info(`[widgetarium] photos of ${app} skipped: none were given`);
			return;
		}

		const files = photoFilesOf(photos, Date.now().toString(36));
		const written = photoWrites.queuePhotoWrite(app, () => photosWritten({ designFiles, app, photos, files }));
		await written.catch((failure: unknown) => {
			throw new Error(PHOTOS_FAILED.replace("{why}", reasonOf(failure)));
		});
		designFolder.forgetFolder(app);
		emit(DesignChangedEvent, { app });
		console.info(`[widgetarium] references of ${app}: + ${files.join(", ")} (photos added)`);
	});

interface PhotosWrite {
	readonly designFiles: DesignFilesGateway;
	readonly app: string;
	readonly photos: readonly File[];
	readonly files: readonly string[];
}

// TODO: write the files and the references as one step, and find photo files no reference names
async function photosWritten({ designFiles, app, photos, files }: PhotosWrite): Promise<void> {
	const folder = `${designFolderOf(app)}/${REFERENCES_FOLDER}`;

	if (!(await designFiles.exists(folder))) {
		await designFiles.makeFolder(folder);
	}

	await Promise.all(
		photos.map(async (photo, at) =>
			designFiles.writeBinary(referencePathOf(app, files[at] ?? ""), await photo.arrayBuffer()),
		),
	);
	const added = files.map((file) => ({ file }));
	const design = designPathOf(app);

	if (await designFiles.exists(design)) {
		return designFiles.changeText(design, (text) => withReferencesAdded(text, added));
	}

	await designFiles.writeText(design, withReferencesAdded(null, added));
}
