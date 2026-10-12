import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { IQuery } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { DrawingKitSchema } from "../../schemas/drawing.schema.js";
import type { DrawingKit } from "../../schemas/drawing.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class DrawingQuery extends IQuery.output(DrawingKitSchema) {
	readonly settlesNow = true;

	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	get(): DrawingKit {
		const { design, gpu, ownsPaste } = canvasSourceIn(this.ports);
		return { ...design.drawing(), gpu, ownsPaste, takesPictures: design.pictureOf !== null };
	}
}
