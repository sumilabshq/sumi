import { IQuery } from "@widgetarium/core";
import { CanvasModeSchema } from "../../schemas/canvas-view.schema.js";
import type { CanvasMode } from "../../schemas/canvas-view.schema.js";
import type { CanvasState } from "../view/canvas-state.js";

export class ModeQuery extends IQuery.output(CanvasModeSchema) {
	readonly settlesNow = true;

	constructor(private readonly state: CanvasState) {
		super();
	}

	get(): CanvasMode {
		return this.state.now().mode;
	}

	override subscribe(changed: () => void): () => void {
		return this.state.watch(["mode"], changed);
	}
}
