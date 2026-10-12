import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { IQuery } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { ReadDesignSchema } from "../../schemas/design.schema.js";
import type { ReadDesign } from "../../schemas/design.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";
import { watchSource } from "./design-reads.js";
import { readDesign } from "./read-design.js";

export class DesignQuery extends IQuery.output(ReadDesignSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(): Promise<ReadDesign> {
		const { design: source, app } = canvasSourceIn(this.ports);
		const { design } = await readDesign(source, app);
		return { ...design.value, app, stamp: design.version };
	}

	override subscribe(changed: () => void): () => void {
		const { design, app } = canvasSourceIn(this.ports);
		return watchSource(design, app, changed);
	}
}
