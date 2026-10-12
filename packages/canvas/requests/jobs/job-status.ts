import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { ReturnedOf } from "@widgetarium/core/mediator";
import { ShownJobSchema } from "../../schema/job.js";
import { DesignSource } from "../../ports/design-source.port.js";
import { DesignReads } from "../design/design-reads.js";
import { pagesNow, watchPages } from "../pages/pages-now.js";
import { CanvasStore } from "../view/canvas-store.js";

export const JobStatusQuery = query("canvas/job-status").output(z.object({ shown: ShownJobSchema.nullable() }));

export class JobStatusQueryHandler extends handlerOf(JobStatusQuery) {
	private readonly designReads = inject(DesignReads);
	private readonly designSource = inject(DesignSource);
	private readonly canvasStore = inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof JobStatusQuery>> {
		const { app, pages } = await pagesNow(this.designReads, this.canvasStore);
		const job = pages.shownJob;
		if (!job) return { shown: null };
		const live = this.designSource.liveJob(app, job.id);
		return { shown: { job, spent: live ? live.spent : job.spent } };
	}

	watch(_input: void, changed: () => void): () => void {
		return watchPages(this.designReads, this.canvasStore, changed);
	}
}
