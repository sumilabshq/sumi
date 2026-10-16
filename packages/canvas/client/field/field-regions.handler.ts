import { handlerOf } from "@widgetarium/core/mediator";
import type { Watching, ReturnedOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../adapters/design-source/design-source.adapter.js";
import { DesignReads } from "../../lib/design/design-reads.js";
import { pagesNow, watchPages } from "../../lib/pages/pages-now.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { regionsOf } from "../../lib/field/regions-of.js";
import { FieldRegionsQuery } from "../../requests/field-regions.query.js";

export class FieldRegionsQueryHandler extends handlerOf(FieldRegionsQuery) {
	private readonly designReads = this.inject(DesignReads);
	private readonly designSource = this.inject(DesignSource);
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof FieldRegionsQuery>> {
		return { regions: regionsOf(await pagesNow(this.designReads, this.canvasStore), this.designSource.drawing()) };
	}

	override watch({ changed }: Watching<typeof FieldRegionsQuery>): () => void {
		return watchPages(this.designReads, this.canvasStore, changed);
	}
}
