import { IQuery } from "@widgetarium/core";
import { FramePicturesSchema } from "../../schemas/frame-picture.schema.js";
import type { FramePictures } from "../../schemas/frame-picture.schema.js";
import type { FramePicturesService } from "./frame-pictures.service.js";

export class FramePicturesQuery extends IQuery.output(FramePicturesSchema) {
	readonly settlesNow = true;

	constructor(private readonly pictures: FramePicturesService) {
		super();
	}

	get(): FramePictures {
		return this.pictures.now();
	}

	override subscribe(changed: () => void): () => void {
		return this.pictures.watch(changed);
	}
}
