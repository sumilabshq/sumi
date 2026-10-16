import { handler } from "@widgetarium/core/requests";
import { DesignJobs } from "../../adapters/design-jobs/design-jobs.adapter.js";
import { DesignReads } from "../../lib/design/design-reads.js";
import { pagesNow, watchPages } from "../../lib/pages/pages-now.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { JobStatusQuery, StopJobCommand } from "./contract.js";

export const jobStatusHandler = handler(JobStatusQuery, {
	inject: { designReads: DesignReads, designJobs: DesignJobs, canvasStore: CanvasStore },
	run: async (_input, { designReads, designJobs, canvasStore }) => {
		const { app, pages } = await pagesNow(designReads, canvasStore);
		const job = pages.shownJob;
		if (!job) return { shown: null };
		const live = designJobs.liveJob(app, job.id);
		return { shown: { job, spent: live ? live.spent : job.spent } };
	},
	watch: (_input, { designReads, canvasStore }, changed) => watchPages(designReads, canvasStore, changed),
});

export const stopJobHandler = handler(StopJobCommand, {
	inject: { designJobs: DesignJobs, canvasStore: CanvasStore },
	run: ({ id }, { designJobs, canvasStore }) => designJobs.stopJob(canvasStore.now().app, id),
});
