import { handler } from "@widgetarium/core/requests";
import { DesignJobs } from "../../adapters/design-jobs/design-jobs.adapter.js";
import { DesignReads } from "../../shared/lib/design/design-reads.js";
import { pagesNow, watchPages } from "../../shared/lib/pages/pages-now.js";
import { CanvasStore } from "../../shared/lib/view/canvas-store.js";
import { JobStatusQuery, StopJobCommand } from "./contract.js";
import { CanvasClientModule } from "../../module.js";

export const JobStatusQueryHandler = handler(JobStatusQuery, CanvasClientModule)
	.inject({ designReads: DesignReads, designJobs: DesignJobs, canvasStore: CanvasStore })
	.watch((_input, { designReads, canvasStore }, changed) => watchPages(designReads, canvasStore, changed))
	.handle(async (_input, { designReads, designJobs, canvasStore }) => {
		const { app, pages } = await pagesNow(designReads, canvasStore);
		const job = pages.shownJob;
		if (!job) return { shown: null };
		const live = designJobs.liveOf(app, job.id);
		return { shown: { job, spent: live ? live.spent : job.spent } };
	});

export const StopJobCommandHandler = handler(StopJobCommand, CanvasClientModule)
	.inject({ designJobs: DesignJobs, canvasStore: CanvasStore })
	.handle(({ id }, { designJobs, canvasStore }) => designJobs.stop(canvasStore.now().app, id));
