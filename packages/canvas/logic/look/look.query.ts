import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { IQuery } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { LookReadSchema } from "../../schemas/look.schema.js";
import type { LookRead } from "../../schemas/look.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";
import { LOOK_READS, watchSource } from "../design/design-reads.js";

export class LookQuery extends IQuery.output(LookReadSchema.nullable()) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(): Promise<LookRead | null> {
		const { design: source, app } = canvasSourceIn(this.ports);
		const read = (await LOOK_READS.read(source, app, () => source.look(app))).value;
		if (!read) return null;
		return read.refusal === undefined ? { value: read.value } : { refusal: read.refusal };
	}

	override subscribe(changed: () => void): () => void {
		const { design, app } = canvasSourceIn(this.ports);
		return watchSource(design, app, changed);
	}
}
