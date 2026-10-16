import { clientModule } from "@widgetarium/core/requests";
import { CachedDesignReads } from "./shared/lib/design/design-reads.js";
import { PhotoQueue } from "./features/photos/lib/photo-queue.js";
import { QueuedFramePictures } from "./features/pictures/lib/frame-picture-taker.js";
import { MomentCanvasStore } from "./shared/lib/view/canvas-store.js";
import type { CanvasParts } from "./adapters/canvas-parts/canvas-parts.adapter.js";

export const CanvasClientModule = clientModule("canvas").provide((parts: CanvasParts) => ({
	...parts,
	canvasStore: new MomentCanvasStore(parts.canvasHost.opened, (kept) => parts.canvasHost.keepOpening(kept)),
	designReads: new CachedDesignReads(parts.designFolder, parts.designJobs, parts.designFiles),
	framePictures: new QueuedFramePictures(),
	photoQueue: new PhotoQueue(),
}));
