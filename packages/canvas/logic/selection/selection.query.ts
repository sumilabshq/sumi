import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { IQuery } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { SelectionSchema } from "../../schemas/selection.schema.js";
import type { Selection } from "../../schemas/selection.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class SelectionQuery extends IQuery.output(SelectionSchema.nullable()) {
	readonly settlesNow = true;

	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	get(): Selection | null {
		return canvasSourceIn(this.ports).state.now().selection;
	}

	override subscribe(changed: () => void): () => void {
		return canvasSourceIn(this.ports).state.watch(["selection"], changed);
	}
}
