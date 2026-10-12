import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { ReturnedOf } from "@widgetarium/core/mediator";
import { COMPONENTS_PAGE } from "../../schema/canvas-page.js";
import { DesignReads } from "../design/design-reads.js";
import { pagesNow, watchPages } from "../pages/pages-now.js";
import { CanvasStore } from "../view/canvas-store.js";

export const LayersToggleQuery = query("canvas/layers-toggle").output(
	z.object({ isShown: z.boolean(), isOpen: z.boolean() }),
);

export class LayersToggleQueryHandler extends handlerOf(LayersToggleQuery) {
	private readonly designReads = inject(DesignReads);
	private readonly canvasStore = inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof LayersToggleQuery>> {
		const { pages } = await pagesNow(this.designReads, this.canvasStore);
		return { isShown: pages.shown !== COMPONENTS_PAGE, isOpen: this.canvasStore.now().isLayersOpen };
	}

	watch(_input: void, changed: () => void): () => void {
		return watchPages(this.designReads, this.canvasStore, changed, ["isLayersOpen"]);
	}
}
