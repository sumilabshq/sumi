import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { IQuery } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { CanvasModeSchema } from "../../schemas/canvas-view.schema.js";
import type { CanvasMode } from "../../schemas/canvas-view.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class ModeQuery extends IQuery.output(CanvasModeSchema) {
	readonly settlesNow = true;

	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	get(): CanvasMode {
		return canvasSourceIn(this.ports).state.now().mode;
	}

	override subscribe(changed: () => void): () => void {
		return canvasSourceIn(this.ports).state.watch(["mode"], changed);
	}
}
