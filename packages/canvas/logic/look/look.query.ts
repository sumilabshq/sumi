import { IQuery } from "@widgetarium/core";
import { LookReadSchema } from "../../schemas/look.schema.js";
import type { LookRead } from "../../schemas/look.schema.js";
import { LOOK_READS, watchSource } from "../design/design-reads.js";
import type { DesignSource } from "../design/design-source.js";
import type { CanvasState } from "../view/canvas-state.js";

export class LookQuery extends IQuery.output(LookReadSchema.nullable()) {
	constructor(
		private readonly source: DesignSource,
		private readonly state: CanvasState,
	) {
		super();
	}

	async get(): Promise<LookRead | null> {
		const { source } = this;
		const { app } = this.state.now();
		const read = (await LOOK_READS.read(source, app, () => source.look(app))).value;
		if (!read) return null;
		return read.refusal === undefined ? { value: read.value } : { refusal: read.refusal };
	}

	override subscribe(changed: () => void): () => void {
		return watchSource(this.source, this.state.now().app, changed);
	}
}
