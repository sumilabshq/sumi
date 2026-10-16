import { handlerOf } from "@widgetarium/core/mediator";
import type { Watching, ReturnedOf } from "@widgetarium/core/mediator";
import { COMPONENTS_PAGE } from "../../schema/canvas-page.schema.js";
import { DesignReads } from "../../lib/design/design-reads.js";
import { pagesNow, watchPages } from "../../lib/pages/pages-now.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { LayersToggleQuery } from "../../requests/layers-toggle.query.js";

export class LayersToggleQueryHandler extends handlerOf(LayersToggleQuery) {
	private readonly designReads = this.inject(DesignReads);
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof LayersToggleQuery>> {
		const { pages } = await pagesNow(this.designReads, this.canvasStore);
		return { isShown: pages.shown !== COMPONENTS_PAGE, isOpen: this.canvasStore.now().isLayersOpen };
	}

	override watch({ changed }: Watching<typeof LayersToggleQuery>): () => void {
		return watchPages(this.designReads, this.canvasStore, changed, ["isLayersOpen"]);
	}
}
