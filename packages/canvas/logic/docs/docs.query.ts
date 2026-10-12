import { IQuery, PageInputSchema, PageOf } from "@widgetarium/core";
import type { Page, PageInput } from "@widgetarium/core";
import { offsetOfCursor, pageAt } from "@widgetarium/core/gateway/page.js";
import { CanvasDocSchema } from "../../schemas/doc.schema.js";
import type { CanvasDoc } from "../../schemas/doc.schema.js";
import { DOCS_READS, watchSource } from "../design/design-reads.js";
import type { DesignSource } from "../design/design-source.js";
import type { CanvasState } from "../view/canvas-state.js";

export class DocsQuery extends IQuery.input(PageInputSchema).output(PageOf(CanvasDocSchema)) {
	constructor(
		private readonly source: DesignSource,
		private readonly state: CanvasState,
	) {
		super();
	}

	async query({ cursor, limit }: PageInput): Promise<Page<CanvasDoc>> {
		const { source } = this;
		const { app } = this.state.now();
		const docs = (await DOCS_READS.read(source, app, () => source.docs(app))).value;
		const offset = offsetOfCursor(cursor);
		return pageAt(docs.slice(offset, offset + limit), offset, docs.length);
	}

	override subscribe(changed: () => void): () => void {
		return watchSource(this.source, this.state.now().app, changed);
	}
}
