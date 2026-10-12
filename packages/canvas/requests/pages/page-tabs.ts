import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { ReturnedOf } from "@widgetarium/core/mediator";
import { PAGES_TAB } from "../../schema/canvas-page.js";
import { DesignReads } from "../design/design-reads.js";
import { CanvasStore } from "../view/canvas-store.js";
import { pagesNow, watchPages } from "./pages-now.js";

export const PageTabsQuery = query("canvas/page-tabs").output(
	z.object({
		leading: z.array(z.string()),
		pages: z.array(z.object({ page: z.string(), isRunning: z.boolean(), isShown: z.boolean() })),
		trailing: z.array(z.string()),
		shown: z.string(),
		shownTab: z.string(),
	}),
);

export class PageTabsQueryHandler extends handlerOf(PageTabsQuery) {
	private readonly designReads = inject(DesignReads);
	private readonly canvasStore = inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof PageTabsQuery>> {
		const { pages } = await pagesNow(this.designReads, this.canvasStore);
		return {
			leading: [...pages.leading],
			pages: pages.screens.map((page) => ({ page, isRunning: page in pages.running, isShown: page === pages.shown })),
			trailing: [...pages.trailing],
			shown: pages.shown,
			shownTab: pages.screens.includes(pages.shown) ? PAGES_TAB : pages.shown,
		};
	}

	watch(_input: void, changed: () => void): () => void {
		return watchPages(this.designReads, this.canvasStore, changed);
	}
}
