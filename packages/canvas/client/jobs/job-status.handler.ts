import { handlerOf } from "@widgetarium/core/mediator";
import type { Watching, ReturnedOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../adapters/design-source/design-source.adapter.js";
import { DesignReads } from "../../lib/design/design-reads.js";
import { pagesNow, watchPages } from "../../lib/pages/pages-now.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { JobStatusQuery } from "../../requests/job-status.query.js";

export class JobStatusQueryHandler extends handlerOf(JobStatusQuery) {
	private readonly designReads = this.inject(DesignReads);
	private readonly designSource = this.inject(DesignSource);
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof JobStatusQuery>> {
		const { app, pages } = await pagesNow(this.designReads, this.canvasStore);
		const job = pages.shownJob;
		if (!job) return { shown: null };
		const live = this.designSource.liveJob(app, job.id);
		return { shown: { job, spent: live ? live.spent : job.spent } };
	}

	override watch({ changed }: Watching<typeof JobStatusQuery>): () => void {
		return watchPages(this.designReads, this.canvasStore, changed);
	}
}
