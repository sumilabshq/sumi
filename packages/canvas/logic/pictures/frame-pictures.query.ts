import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { IQuery } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { FramePicturesSchema } from "../../schemas/frame-picture.schema.js";
import type { FramePictures } from "../../schemas/frame-picture.schema.js";
import { FRAME_PICTURES } from "./frame-pictures.service.js";

export class FramePicturesQuery extends IQuery.output(FramePicturesSchema) {
	readonly settlesNow = true;

	constructor(
		readonly fields: NoFields,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	get(): FramePictures {
		return FRAME_PICTURES.now();
	}

	override subscribe(changed: () => void): () => void {
		return FRAME_PICTURES.watch(changed);
	}
}
