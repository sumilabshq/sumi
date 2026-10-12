import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { PageInputSchema, PageOf } from "@widgetarium/core";
import { offsetOfCursor, pageAt } from "@widgetarium/core/gateway/page.js";
import type { Page, PageInput } from "@widgetarium/core";
import { IQuery } from "@widgetarium/core";
import type { NoFields } from "../../schemas/canvas-fields.schema.js";
import { CanvasDocSchema } from "../../schemas/doc.schema.js";
import type { CanvasDoc } from "../../schemas/doc.schema.js";
import { canvasSourceIn } from "../canvas/canvas-source.js";
import { DOCS_READS, watchSource } from "../design/design-reads.js";

export class DocsQuery extends IQuery.input(PageInputSchema).output(PageOf(CanvasDocSchema)) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async query({ cursor, limit }: PageInput): Promise<Page<CanvasDoc>> {
		const { design: source, app } = canvasSourceIn(this.ports);
		const docs = (await DOCS_READS.read(source, app, () => source.docs(app))).value;
		const offset = offsetOfCursor(cursor);
		return pageAt(docs.slice(offset, offset + limit), offset, docs.length);
	}

	override subscribe(changed: () => void): () => void {
		const { design, app } = canvasSourceIn(this.ports);
		return watchSource(design, app, changed);
	}
}
