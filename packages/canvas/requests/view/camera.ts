import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { ReturnedOf } from "@widgetarium/core/mediator";
import { CameraSchema } from "../../schema/camera.js";
import { CanvasStore } from "./canvas-store.js";

export const CameraQuery = query("canvas/camera").output(z.object({ camera: CameraSchema.nullable() }));

export class CameraQueryHandler extends handlerOf(CameraQuery) {
	private readonly canvasStore = inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof CameraQuery>> {
		return { camera: this.canvasStore.now().camera };
	}

	watch(_input: void, changed: () => void): () => void {
		return this.canvasStore.watch(["camera"], changed);
	}
}
