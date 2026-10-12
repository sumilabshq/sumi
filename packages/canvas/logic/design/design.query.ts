import { IQuery } from "@widgetarium/core";
import { ReadDesignSchema } from "../../schemas/design.schema.js";
import type { ReadDesign } from "../../schemas/design.schema.js";
import { watchSource } from "./design-reads.js";
import type { DesignSource } from "./design-source.js";
import { readDesign } from "./read-design.js";
import type { CanvasState } from "../view/canvas-state.js";

export class DesignQuery extends IQuery.output(ReadDesignSchema) {
	constructor(
		private readonly source: DesignSource,
		private readonly state: CanvasState,
	) {
		super();
	}

	async get(): Promise<ReadDesign> {
		const { app } = this.state.now();
		const { design } = await readDesign(this.source, app);
		return { ...design.value, app, stamp: design.version };
	}

	override subscribe(changed: () => void): () => void {
		return watchSource(this.source, this.state.now().app, changed);
	}
}
