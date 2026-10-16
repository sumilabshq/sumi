import { handler } from "@widgetarium/core/requests";
import { CanvasHost } from "../../adapters/canvas-host/canvas-host.adapter.js";
import { DesignFiles } from "../../adapters/design-files/design-files.adapter.js";
import { DesignReads } from "../../shared/lib/design/design-reads.js";
import { addPhotos } from "./lib/add-photos.js";
import { PhotoQueue } from "./lib/photo-queue.js";
import { CanvasStore } from "../../shared/lib/view/canvas-store.js";
import { AddPhotosCommand, PastePhotosCommand } from "./contract.js";
import { CanvasClientModule } from "../../module.js";

const PHOTO_ADDING = {
	designReads: DesignReads,
	designFiles: DesignFiles,
	canvasStore: CanvasStore,
	photoQueue: PhotoQueue,
};

export const AddPhotosCommandHandler = handler(AddPhotosCommand, CanvasClientModule)
	.inject(PHOTO_ADDING)
	.handle(({ photos }, adding) => addPhotos(adding, photos));

export const PastePhotosCommandHandler = handler(PastePhotosCommand, CanvasClientModule)
	.inject({ ...PHOTO_ADDING, canvasHost: CanvasHost })
	.handle(async ({ photos }, { canvasHost, ...adding }) => {
		if (!canvasHost.ownsPaste()) return { isTaken: false };
		await addPhotos(adding, photos);
		return { isTaken: true };
	});
