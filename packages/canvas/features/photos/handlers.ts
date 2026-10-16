import { handler } from "@widgetarium/core/requests";
import { CanvasHost } from "../../adapters/canvas-host/canvas-host.adapter.js";
import { DesignPhotos } from "../../adapters/design-photos/design-photos.adapter.js";
import { DesignReads } from "../../lib/design/design-reads.js";
import { addPhotos } from "../../lib/photos/add-photos.js";
import { PhotoQueue } from "../../lib/photos/photo-queue.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { AddPhotosCommand, PastePhotosCommand } from "./contract.js";

const PHOTO_ADDING = {
	designReads: DesignReads,
	designPhotos: DesignPhotos,
	canvasStore: CanvasStore,
	photoQueue: PhotoQueue,
};

export const addPhotosHandler = handler(AddPhotosCommand, {
	inject: PHOTO_ADDING,
	run: ({ photos }, adding) => addPhotos(adding, photos),
});

export const pastePhotosHandler = handler(PastePhotosCommand, {
	inject: { ...PHOTO_ADDING, canvasHost: CanvasHost },
	run: async ({ photos }, { canvasHost, ...adding }) => {
		if (!canvasHost.ownsPaste()) return { isTaken: false };
		await addPhotos(adding, photos);
		return { isTaken: true };
	},
});
