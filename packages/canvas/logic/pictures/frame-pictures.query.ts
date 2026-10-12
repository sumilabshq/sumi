import { IQuery } from "@widgetarium/core";
import { FramePicturesSchema } from "../../schemas/frame-picture.schema.js";
import type { FramePictures } from "../../schemas/frame-picture.schema.js";
import { FRAME_PICTURES } from "./frame-pictures.service.js";

export class FramePicturesQuery extends IQuery.output(FramePicturesSchema) {
	readonly settlesNow = true;

	get(): FramePictures {
		return FRAME_PICTURES.now();
	}

	override subscribe(changed: () => void): () => void {
		return FRAME_PICTURES.watch(changed);
	}
}
