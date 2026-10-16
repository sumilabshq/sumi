import { handlerOf } from "@widgetarium/core/mediator";
import type { Watching, ReturnedOf } from "@widgetarium/core/mediator";
import { DesignReads } from "../../lib/design/design-reads.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { pagesNow, watchPages } from "../../lib/pages/pages-now.js";
import { VariantsQuery } from "../../requests/variants.query.js";

const PICKED = "Picked";

export class VariantsQueryHandler extends handlerOf(VariantsQuery) {
	private readonly designReads = this.inject(DesignReads);
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof VariantsQuery>> {
		const { pages } = await pagesNow(this.designReads, this.canvasStore);
		return {
			isShown: pages.variants.length >= 2,
			shown: pages.shownScreen ?? "",
			items: pages.variants.map(({ screen, letter }) => ({ value: screen, label: letter ?? PICKED })),
		};
	}

	override watch({ changed }: Watching<typeof VariantsQuery>): () => void {
		return watchPages(this.designReads, this.canvasStore, changed);
	}
}
