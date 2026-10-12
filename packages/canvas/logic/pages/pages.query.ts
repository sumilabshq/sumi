import { IQuery } from "@widgetarium/core";
import { CanvasPagesSchema } from "../../schemas/canvas-page.schema.js";
import type { CanvasPages } from "../../schemas/canvas-page.schema.js";
import { watchSource } from "../design/design-reads.js";
import type { DesignSource } from "../design/design-source.js";
import type { CanvasState } from "../view/canvas-state.js";
import { readPages } from "./read-pages.js";

export class PagesQuery extends IQuery.output(CanvasPagesSchema) {
	constructor(
		private readonly source: DesignSource,
		private readonly app: string,
		private readonly state: CanvasState,
	) {
		super();
	}

	async get(): Promise<CanvasPages> {
		return readPages(this.source, this.app, this.state);
	}

	override subscribe(changed: () => void): () => void {
		const stopSource = watchSource(this.source, this.app, changed);
		const stopState = this.state.watch(["page", "keptPage", "variants"], changed);
		return () => {
			stopSource();
			stopState();
		};
	}
}
