import { IQuery } from "@widgetarium/core";
import { z } from "zod";
import type { CanvasState } from "../view/canvas-state.js";

export class LayersOpenQuery extends IQuery.output(z.boolean()) {
	readonly settlesNow = true;

	constructor(private readonly state: CanvasState) {
		super();
	}

	get(): boolean {
		return this.state.now().isLayersOpen;
	}

	override subscribe(changed: () => void): () => void {
		return this.state.watch(["isLayersOpen"], changed);
	}
}
