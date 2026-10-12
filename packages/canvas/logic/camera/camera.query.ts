import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { IQuery } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { CameraSchema } from "../../schemas/camera.schema.js";
import type { Camera } from "../../schemas/camera.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class CameraQuery extends IQuery.output(CameraSchema.nullable()) {
	readonly settlesNow = true;

	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	get(): Camera | null {
		return canvasSourceIn(this.ports).state.now().camera;
	}

	override subscribe(changed: () => void): () => void {
		return canvasSourceIn(this.ports).state.watch(["camera"], changed);
	}
}
