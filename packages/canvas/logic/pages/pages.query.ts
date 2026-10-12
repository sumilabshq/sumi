import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { IQuery } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { CanvasPagesSchema } from "../../schemas/canvas-page.schema.js";
import type { CanvasPages } from "../../schemas/canvas-page.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";
import { watchSource } from "../design/design-reads.js";
import { readPages } from "./read-pages.js";

export class PagesQuery extends IQuery.output(CanvasPagesSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(): Promise<CanvasPages> {
		return readPages(canvasSourceIn(this.ports));
	}

	override subscribe(changed: () => void): () => void {
		const { design, app, state } = canvasSourceIn(this.ports);
		const stopSource = watchSource(design, app, changed);
		const stopState = state.watch(["page", "keptPage", "variants"], changed);
		return () => {
			stopSource();
			stopState();
		};
	}
}
