import { IQuery } from "@widgetarium/core";
import { PageRendererSchema } from "../../schemas/canvas-view.schema.js";
import type { PageRenderer } from "../../schemas/canvas-view.schema.js";
import type { CanvasState } from "../view/canvas-state.js";

export class RendererQuery extends IQuery.output(PageRendererSchema) {
	readonly settlesNow = true;

	constructor(private readonly state: CanvasState) {
		super();
	}

	get(): PageRenderer {
		return this.state.now().renderer;
	}

	override subscribe(changed: () => void): () => void {
		return this.state.watch(["renderer"], changed);
	}
}
