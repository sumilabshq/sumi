import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { IQuery } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { PageRendererSchema } from "../../schemas/canvas-view.schema.js";
import type { PageRenderer } from "../../schemas/canvas-view.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class RendererQuery extends IQuery.output(PageRendererSchema) {
	readonly settlesNow = true;

	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	get(): PageRenderer {
		return canvasSourceIn(this.ports).state.now().renderer;
	}

	override subscribe(changed: () => void): () => void {
		return canvasSourceIn(this.ports).state.watch(["renderer"], changed);
	}
}
