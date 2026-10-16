import { handlerOf } from "@widgetarium/core/mediator";
import type { Watching, ReturnedOf } from "@widgetarium/core/mediator";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { CameraQuery } from "../../requests/camera.query.js";

export class CameraQueryHandler extends handlerOf(CameraQuery) {
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof CameraQuery>> {
		return { camera: this.canvasStore.now().camera };
	}

	override watch({ changed }: Watching<typeof CameraQuery>): () => void {
		return this.canvasStore.watch(["camera"], changed);
	}
}
