import { IQuery } from "@widgetarium/core";
import { SelectionSchema } from "../../schemas/selection.schema.js";
import type { Selection } from "../../schemas/selection.schema.js";
import type { CanvasState } from "../view/canvas-state.js";

export class SelectionQuery extends IQuery.output(SelectionSchema.nullable()) {
	readonly settlesNow = true;

	constructor(private readonly state: CanvasState) {
		super();
	}

	get(): Selection | null {
		return this.state.now().selection;
	}

	override subscribe(changed: () => void): () => void {
		return this.state.watch(["selection"], changed);
	}
}
