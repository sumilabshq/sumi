import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { IQuery } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { FrameSizeSchema } from "../../schemas/frame-size.schema.js";
import type { FrameSize } from "../../schemas/frame-size.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class ViewportQuery extends IQuery.output(FrameSizeSchema.nullable()) {
	readonly settlesNow = true;

	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	get(): FrameSize | null {
		return canvasSourceIn(this.ports).state.now().viewport;
	}

	override subscribe(changed: () => void): () => void {
		return canvasSourceIn(this.ports).state.watch(["viewport"], changed);
	}
}
