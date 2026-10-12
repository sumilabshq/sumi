import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { IQuery } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { z } from "zod";
import { canvasSourceIn } from "../canvas/canvas-source.js";

export class FocusedWidgetQuery extends IQuery.output(z.string().nullable()) {
	readonly settlesNow = true;

	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	get(): string | null {
		return canvasSourceIn(this.ports).state.now().focusedWidget;
	}

	override subscribe(changed: () => void): () => void {
		return canvasSourceIn(this.ports).state.watch(["focusedWidget"], changed);
	}
}
