import { IQuery } from "@widgetarium/core";
import { CameraSchema } from "../../schemas/camera.schema.js";
import type { Camera } from "../../schemas/camera.schema.js";
import type { CanvasState } from "../view/canvas-state.js";

export class CameraQuery extends IQuery.output(CameraSchema.nullable()) {
	readonly settlesNow = true;

	constructor(private readonly state: CanvasState) {
		super();
	}

	get(): Camera | null {
		return this.state.now().camera;
	}

	override subscribe(changed: () => void): () => void {
		return this.state.watch(["camera"], changed);
	}
}
