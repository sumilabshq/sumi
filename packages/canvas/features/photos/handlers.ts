import { handler } from "@widgetarium/core/requests";
import { CanvasHost } from "../../gateways/canvas-host/canvas-host.gateway.js";
import { DesignFilesGateway } from "../../gateways/design-files/design-files.gateway.js";
import { DesignReads } from "../../shared/lib/design/design-reads.js";
import { addPhotos } from "./lib/add-photos.js";
import { PhotoQueue } from "../../shared/lib/photos/photo-queue.js";
import { CanvasStore } from "../../shared/lib/view/canvas-store.js";
import { AddPhotosCommand, PastePhotosCommand } from "./contract.js";
import { CanvasClientModule } from "../../module.js";

const PHOTO_ADDING = {
	designReads: DesignReads,
	designFilesGateway: DesignFilesGateway,
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
