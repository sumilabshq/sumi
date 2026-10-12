import type { GpuSupply } from "@widgetarium/gpu";
import { IQuery } from "@widgetarium/core";
import { DrawingKitSchema } from "../../schemas/drawing.schema.js";
import type { DrawingKit } from "../../schemas/drawing.schema.js";
import type { DesignSource } from "./design-source.js";

export class DrawingQuery extends IQuery.output(DrawingKitSchema) {
	readonly settlesNow = true;

	constructor(
		private readonly source: DesignSource,
		private readonly gpu: GpuSupply | null,
		private readonly ownsPaste: (() => boolean) | null,
	) {
		super();
	}

	get(): DrawingKit {
		const { gpu, ownsPaste, source } = this;
		return { ...source.drawing(), gpu, ownsPaste, takesPictures: source.pictureOf !== null };
	}
}
