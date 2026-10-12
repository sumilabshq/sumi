import { IQuery } from "@widgetarium/core";
import { FrameSizeSchema } from "../../schemas/frame-size.schema.js";
import type { FrameSize } from "../../schemas/frame-size.schema.js";
import type { CanvasState } from "../view/canvas-state.js";

export class ViewportQuery extends IQuery.output(FrameSizeSchema.nullable()) {
	readonly settlesNow = true;

	constructor(private readonly state: CanvasState) {
		super();
	}

	get(): FrameSize | null {
		return this.state.now().viewport;
	}

	override subscribe(changed: () => void): () => void {
		return this.state.watch(["viewport"], changed);
	}
}
