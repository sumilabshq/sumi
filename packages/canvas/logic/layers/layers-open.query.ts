import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { IQuery } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { z } from "zod";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class LayersOpenQuery extends IQuery.output(z.boolean()) {
	readonly settlesNow = true;

	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	get(): boolean {
		return canvasSourceIn(this.ports).state.now().isLayersOpen;
	}

	override subscribe(changed: () => void): () => void {
		return canvasSourceIn(this.ports).state.watch(["isLayersOpen"], changed);
	}
}
