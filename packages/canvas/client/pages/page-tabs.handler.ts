import { handlerOf } from "@widgetarium/core/mediator";
import type { Watching, ReturnedOf } from "@widgetarium/core/mediator";
import { PAGES_TAB } from "../../schema/canvas-page.schema.js";
import { DesignReads } from "../../lib/design/design-reads.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { pagesNow, watchPages } from "../../lib/pages/pages-now.js";
import { PageTabsQuery } from "../../requests/page-tabs.query.js";

export class PageTabsQueryHandler extends handlerOf(PageTabsQuery) {
	private readonly designReads = this.inject(DesignReads);
	private readonly canvasStore = this.inject(CanvasStore);

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

	override watch({ changed }: Watching<typeof PageTabsQuery>): () => void {
		return watchPages(this.designReads, this.canvasStore, changed);
	}
}
