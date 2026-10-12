import { IQuery } from "@widgetarium/core";
import { ReadDesignSchema } from "../../schemas/design.schema.js";
import type { ReadDesign } from "../../schemas/design.schema.js";
import { watchSource } from "./design-reads.js";
import type { DesignSource } from "./design-source.js";
import { readDesign } from "./read-design.js";

export class DesignQuery extends IQuery.output(ReadDesignSchema) {
	constructor(
		private readonly source: DesignSource,
		private readonly app: string,
	) {
		super();
	}

	async get(): Promise<ReadDesign> {
		const { design } = await readDesign(this.source, this.app);
		return { ...design.value, app: this.app, stamp: design.version };
	}

	override subscribe(changed: () => void): () => void {
		return watchSource(this.source, this.app, changed);
	}
}
